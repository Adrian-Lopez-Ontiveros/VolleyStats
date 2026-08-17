"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { VolleyballCourt } from "@/components/matches/volleyball-court";
import { POSITION_LABELS } from "@/lib/constants";
import {
  COURT_POSITIONS,
  COURT_POSITION_META,
  isCourtPosition,
  type CourtPosition,
  type CourtSlots,
} from "@/lib/court";
import { cn, formatJersey } from "@/lib/utils";
import type { MatchLineupEntry, Player } from "@/lib/types";

function emptySlots(): Record<CourtPosition, string> {
  return { 1: "", 2: "", 3: "", 4: "", 5: "", 6: "" };
}

function initialSlots(lineup: MatchLineupEntry[], liberoId: string) {
  const slots = emptySlots();
  const placed = new Set<string>();

  for (const entry of lineup) {
    if (!entry.is_starter || entry.player_id === liberoId) continue;
    if (!isCourtPosition(entry.court_position) || slots[entry.court_position]) continue;
    slots[entry.court_position] = entry.player_id;
    placed.add(entry.player_id);
  }

  const unplaced = lineup
    .filter((entry) => entry.is_starter && entry.player_id !== liberoId && !placed.has(entry.player_id))
    .map((entry) => entry.player_id);
  const free = COURT_POSITIONS.filter((position) => !slots[position]);
  unplaced.forEach((playerId, index) => {
    const position = free[index];
    if (position) slots[position] = playerId;
  });

  return slots;
}

export function LineupPicker({
  teamId,
  teamName,
  players,
  lineup = [],
}: {
  teamId: string;
  teamName: string;
  players: Player[];
  lineup?: MatchLineupEntry[];
}) {
  const [liberoId, setLiberoId] = useState(
    lineup.find((entry) => entry.is_libero)?.player_id ?? ""
  );
  const [slots, setSlots] = useState<Record<CourtPosition, string>>(() =>
    initialSlots(lineup, lineup.find((entry) => entry.is_libero)?.player_id ?? "")
  );
  const [activeSlot, setActiveSlot] = useState<CourtPosition | "libero" | null>(null);

  const playersById = useMemo(
    () => new Map(players.map((player) => [player.id, player])),
    [players]
  );
  const starterCount = COURT_POSITIONS.filter((position) => slots[position]).length;
  const courtSlots = useMemo(() => {
    const next: CourtSlots = {};
    for (const position of COURT_POSITIONS) {
      const player = playersById.get(slots[position]);
      next[position] = player ?? null;
    }
    return next;
  }, [playersById, slots]);
  const placedIds = useMemo(() => {
    const ids = new Set(COURT_POSITIONS.map((position) => slots[position]).filter(Boolean));
    if (liberoId) ids.add(liberoId);
    return ids;
  }, [slots, liberoId]);

  function assignPlayer(playerId: string) {
    if (!activeSlot) return;

    if (activeSlot === "libero") {
      setSlots((current) => {
        const next = { ...current };
        for (const position of COURT_POSITIONS) {
          if (next[position] === playerId) next[position] = "";
        }
        return next;
      });
      setLiberoId(playerId);
      setActiveSlot(null);
      return;
    }

    setSlots((current) => {
      const next = { ...current };
      const previousOwner = next[activeSlot];
      const fromPosition = COURT_POSITIONS.find((position) => next[position] === playerId);
      next[activeSlot] = playerId;
      if (fromPosition && fromPosition !== activeSlot) {
        next[fromPosition] = previousOwner;
      }
      return next;
    });
    if (liberoId === playerId) setLiberoId("");
    setActiveSlot(null);
  }

  function clearActive() {
    if (!activeSlot) return;
    if (activeSlot === "libero") setLiberoId("");
    else setSlots((current) => ({ ...current, [activeSlot]: "" }));
    setActiveSlot(null);
  }

  const sheetTitle =
    activeSlot === "libero"
      ? "Líbero"
      : activeSlot
        ? `Posición ${activeSlot} · ${COURT_POSITION_META[activeSlot].label}`
        : "Jugador";

  return (
    <div className="space-y-3">
      <input type="hidden" name="clubTeamId" value={teamId} />
      {COURT_POSITIONS.map((position) =>
        slots[position] ? (
          <input key={position} type="hidden" name={`starterPos${position}`} value={slots[position]} />
        ) : null
      )}
      {liberoId ? <input type="hidden" name="liberoId" value={liberoId} /> : null}

      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">Alineación titular</p>
          <p className="text-xs text-muted-foreground">
            {teamName}. Toca una posición del campo para colocar el dorsal.
          </p>
        </div>
        <Badge variant={starterCount === 6 ? "accent" : "secondary"}>{starterCount}/6</Badge>
      </div>

      {players.length === 0 ? (
        <p className="rounded-xl bg-secondary px-3 py-2 text-xs text-muted-foreground">
          Este equipo todavía no tiene jugadores en la plantilla.
        </p>
      ) : (
        <>
          <VolleyballCourt
            slots={courtSlots}
            libero={playersById.get(liberoId) ?? null}
            interactive
            onSlotClick={(position) => setActiveSlot(position)}
            onLiberoClick={() => setActiveSlot("libero")}
          />
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            6 en pista: 1 saque, 2-3-4 delantera, 5-6 zaguera. El líbero queda fuera. En el
            seguimiento el campo rota al ganar el saque.
          </p>

          {players.filter((player) => !placedIds.has(player.id)).length > 0 ? (
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Banquillo
              </p>
              <ul className="flex flex-wrap gap-1.5">
                {players
                  .filter((player) => !placedIds.has(player.id))
                  .map((player) => (
                    <li
                      key={player.id}
                      className="rounded-full border bg-card px-2.5 py-1 text-xs font-medium"
                    >
                      {formatJersey(player.jersey_number)} {player.full_name}
                    </li>
                  ))}
              </ul>
            </div>
          ) : null}
        </>
      )}

      <Sheet open={activeSlot !== null} onOpenChange={(open) => !open && setActiveSlot(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{sheetTitle}</SheetTitle>
            <SheetDescription>
              {activeSlot === "libero"
                ? "El líbero no cuenta como una de las 6 posiciones de rotación."
                : "El dorsal se verá en esa casilla. Si ya estaba en otra, se intercambian."}
            </SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pb-4">
            {(activeSlot === "libero" ? liberoId : activeSlot && slots[activeSlot]) ? (
              <button
                type="button"
                onClick={clearActive}
                className="h-11 w-full rounded-xl border border-dashed text-sm font-semibold text-muted-foreground"
              >
                Quitar de esta posición
              </button>
            ) : null}
            {players.map((player) => {
              const onCourtAt = COURT_POSITIONS.find((position) => slots[position] === player.id);
              const isLibero = liberoId === player.id;
              const selected =
                (activeSlot === "libero" && isLibero) ||
                (activeSlot !== "libero" && activeSlot !== null && slots[activeSlot] === player.id);
              return (
                <button
                  key={player.id}
                  type="button"
                  onClick={() => assignPlayer(player.id)}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 rounded-2xl border px-3 py-3 text-left",
                    selected ? "border-primary bg-primary text-primary-foreground" : "bg-card"
                  )}
                >
                  <span className="min-w-0">
                    <span className="block font-semibold leading-tight">
                      {formatJersey(player.jersey_number)} {player.full_name}
                    </span>
                    <span
                      className={cn(
                        "block text-xs",
                        selected ? "text-primary-foreground/80" : "text-muted-foreground"
                      )}
                    >
                      {player.position ? POSITION_LABELS[player.position] : "Sin posición"}
                    </span>
                  </span>
                  {onCourtAt ? (
                    <Badge variant={selected ? "secondary" : "outline"}>P{onCourtAt}</Badge>
                  ) : isLibero ? (
                    <Badge variant={selected ? "secondary" : "accent"}>Líbero</Badge>
                  ) : null}
                </button>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
