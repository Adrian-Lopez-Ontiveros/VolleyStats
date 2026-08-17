"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Maximize2, Plus, RotateCcw, Save, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { deleteTacticalPlay, saveTacticalPlay } from "@/lib/actions/plays";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  clamp01,
  createBallPiece,
  createPlayerPiece,
  defaultBoard,
  parseBoard,
  type BoardPiece,
  type BoardPlayerPiece,
  type BoardSide,
  type BoardState,
} from "@/lib/board";
import { firstName } from "@/lib/court";
import { cn, formatJersey } from "@/lib/utils";
import type { Player, TacticalPlay, Team } from "@/lib/types";

type RosterPlayer = Pick<Player, "id" | "full_name" | "jersey_number" | "team_id">;

export function TacticalBoard({
  play,
  plays,
  teams,
  players,
}: {
  play?: TacticalPlay | null;
  plays: TacticalPlay[];
  teams: Team[];
  players: RosterPlayer[];
}) {
  const router = useRouter();
  const courtRef = useRef<HTMLDivElement>(null);
  const [board, setBoard] = useState<BoardState>(() =>
    play ? parseBoard(play.board) : defaultBoard()
  );
  const [name, setName] = useState(play?.name ?? "");
  const [notes, setNotes] = useState(play?.notes ?? "");
  const [teamId, setTeamId] = useState(play?.team_id ?? "");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [picker, setPicker] = useState<BoardSide | null>(null);
  const [pending, setPending] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const dragRef = useRef<{ id: string; pointerId: number } | null>(null);

  useEffect(() => {
    if (!fullscreen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFullscreen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [fullscreen]);

  const clubTeams = teams.filter((team) => team.is_club_team);
  const teamOptions = clubTeams.length > 0 ? clubTeams : teams;
  const roster = useMemo(
    () => (teamId ? players.filter((player) => player.team_id === teamId) : players),
    [players, teamId]
  );

  function updatePiece(id: string, patch: Partial<BoardPiece>) {
    setBoard((current) => ({
      pieces: current.pieces.map((piece) =>
        piece.id === id ? ({ ...piece, ...patch } as BoardPiece) : piece
      ),
    }));
  }

  function pointFromEvent(event: React.PointerEvent) {
    const rect = courtRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return {
      x: clamp01((event.clientX - rect.left) / rect.width),
      y: clamp01((event.clientY - rect.top) / rect.height),
    };
  }

  function onPiecePointerDown(event: React.PointerEvent<HTMLButtonElement>, id: string) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { id, pointerId: event.pointerId };
    setSelectedId(id);
  }

  function onPiecePointerMove(event: React.PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const point = pointFromEvent(event);
    if (!point) return;
    updatePiece(drag.id, point);
  }

  function onPiecePointerUp(event: React.PointerEvent<HTMLButtonElement>) {
    if (dragRef.current?.pointerId === event.pointerId) {
      dragRef.current = null;
    }
  }

  function addPlayer(side: BoardSide, player?: RosterPlayer) {
    const used = new Set(
      board.pieces
        .filter((piece): piece is BoardPlayerPiece => piece.kind === "player")
        .map((piece) => piece.playerId)
        .filter(Boolean)
    );
    const next =
      player ??
      null;
    if (next && used.has(next.id)) {
      toast.error("Ese jugador ya está en la pizarra");
      return;
    }
    const extras = board.pieces.filter(
      (piece) => piece.kind === "player" && piece.team === side && !piece.playerId
    ).length;
    setBoard((current) => ({
      pieces: [
        ...current.pieces,
        createPlayerPiece({
          team: side,
          playerId: next?.id ?? null,
          name: next ? firstName(next.full_name) : side === "us" ? `P${extras + 1}` : `R${extras + 1}`,
          jersey: next?.jersey_number ?? extras + 1,
        }),
      ],
    }));
    setPicker(null);
  }

  function addBall() {
    if (board.pieces.some((piece) => piece.kind === "ball")) {
      toast.message("Ya hay un balón en la pista");
      return;
    }
    setBoard((current) => ({ pieces: [...current.pieces, createBallPiece()] }));
  }

  function removeSelected() {
    if (!selectedId) return;
    setBoard((current) => ({
      pieces: current.pieces.filter((piece) => piece.id !== selectedId),
    }));
    setSelectedId(null);
  }

  function assignSelected(player: RosterPlayer) {
    if (!selectedId) return;
    const selected = board.pieces.find((piece) => piece.id === selectedId);
    if (!selected || selected.kind !== "player") return;
    setBoard((current) => ({
      pieces: current.pieces.map((piece) =>
        piece.id === selectedId && piece.kind === "player"
          ? {
              ...piece,
              playerId: player.id,
              name: firstName(player.full_name),
              jersey: player.jersey_number,
            }
          : piece
      ),
    }));
    setPicker(null);
  }

  async function onSave() {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      toast.error("Pon un nombre a la jugada");
      return;
    }
    setPending(true);
    const result = await saveTacticalPlay({
      id: play?.id,
      name: trimmed,
      notes,
      teamId,
      board,
    });
    setPending(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(play?.id ? "Jugada actualizada" : "Jugada guardada");
    if (!play?.id && result.id) {
      router.replace(`/entrenador/pizarra/${result.id}`);
      router.refresh();
    } else {
      router.refresh();
    }
  }

  async function onDelete() {
    if (!play?.id) return;
    if (!confirm("¿Eliminar esta jugada?")) return;
    setPending(true);
    const result = await deleteTacticalPlay(play.id);
    setPending(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Jugada eliminada");
    router.replace("/entrenador/pizarra");
    router.refresh();
  }

  const selected = board.pieces.find((piece) => piece.id === selectedId) ?? null;

  const court = (
      <div
        ref={courtRef}
        className={cn(
          "relative touch-none select-none overflow-hidden border shadow-sm",
          fullscreen
            ? "h-full min-h-0 w-full rounded-xl border-[#7a451c]/50"
            : "mx-auto w-full max-w-md rounded-2xl border-[#7a451c]/40"
        )}
        style={fullscreen ? undefined : { aspectRatio: "9 / 14", maxHeight: "65dvh" }}
        onPointerDown={() => setSelectedId(null)}
      >
        <CourtLines />
        {board.pieces.map((piece) => (
          <button
            key={piece.id}
            type="button"
            className={cn(
              "absolute z-10 flex -translate-x-1/2 -translate-y-1/2 touch-none items-center justify-center",
              selectedId === piece.id && "z-20"
            )}
            style={{ left: `${piece.x * 100}%`, top: `${piece.y * 100}%` }}
            onPointerDown={(event) => onPiecePointerDown(event, piece.id)}
            onPointerMove={onPiecePointerMove}
            onPointerUp={onPiecePointerUp}
            onPointerCancel={onPiecePointerUp}
          >
            {piece.kind === "ball" ? (
              <span
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full border-2 border-amber-200 bg-amber-400 text-[10px] font-black text-amber-950 shadow-md sm:h-9 sm:w-9",
                  selectedId === piece.id && "ring-2 ring-white ring-offset-2 ring-offset-[#8b5a2b]"
                )}
              >
                ●
              </span>
            ) : (
              <span className="flex flex-col items-center">
                <span
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full border-2 text-xs font-black tabular-nums shadow-md sm:h-11 sm:w-11 sm:text-sm",
                    piece.team === "us"
                      ? "border-white/80 bg-primary text-primary-foreground"
                      : "border-white/80 bg-rose-600 text-white",
                    selectedId === piece.id && "ring-2 ring-white ring-offset-2 ring-offset-[#8b5a2b]"
                  )}
                >
                  {piece.jersey ?? piece.name.slice(0, 2).toUpperCase()}
                </span>
                <span className="mt-0.5 max-w-16 truncate text-[9px] font-semibold text-white drop-shadow">
                  {piece.name}
                </span>
              </span>
            )}
          </button>
        ))}
      </div>
  );

  return (
    <div className="space-y-4">
      {plays.length > 0 ? (
        <div className="flex gap-2 overflow-x-auto pb-1">
          <Button
            type="button"
            size="sm"
            variant={!play ? "accent" : "secondary"}
            onClick={() => {
              router.push("/entrenador/pizarra");
              setBoard(defaultBoard());
              setName("");
              setNotes("");
              setTeamId("");
              setSelectedId(null);
            }}
          >
            Nueva
          </Button>
          {plays.map((item) => (
            <Button
              key={item.id}
              type="button"
              size="sm"
              variant={play?.id === item.id ? "accent" : "outline"}
              onClick={() => router.push(`/entrenador/pizarra/${item.id}`)}
            >
              {item.name}
            </Button>
          ))}
        </div>
      ) : null}

      {fullscreen ? (
        <div className="fixed inset-0 z-50 flex flex-col bg-[#1f140c] pt-safe">
          <div className="flex items-center gap-2 px-3 py-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="bg-white text-foreground hover:bg-white/90"
              onClick={() => setFullscreen(false)}
            >
              <ArrowLeft className="h-4 w-4" />
              Volver
            </Button>
            <p className="truncate text-sm font-semibold text-amber-50">Pizarra táctica</p>
          </div>
          <div className="min-h-0 flex-1 px-3 pb-3">{court}</div>
        </div>
      ) : (
        <>
          <div className="flex justify-end">
            <Button type="button" size="sm" variant="outline" onClick={() => setFullscreen(true)}>
              <Maximize2 className="h-4 w-4" />
              Pantalla completa
            </Button>
          </div>
          {court}
        </>
      )}

      <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <span className="h-3 w-3 rounded-full bg-primary" /> Nosotros
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-3 w-3 rounded-full bg-rose-600" /> Rival
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-3 w-3 rounded-full bg-amber-400" /> Balón
        </span>
        {selected?.kind === "player" ? (
          <span className="font-medium text-foreground">Seleccionado: {selected.name}</span>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Button type="button" variant="secondary" size="sm" onClick={() => setPicker("us")}>
          <Users className="h-4 w-4" />
          Añadir
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={() => addPlayer("them")}>
          <Plus className="h-4 w-4" />
          Rival
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={addBall}>
          Balón
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => {
            setBoard(defaultBoard());
            setSelectedId(null);
          }}
        >
          <RotateCcw className="h-4 w-4" />
          Reset
        </Button>
      </div>

      {selected ? (
        <Button type="button" variant="outline" size="sm" className="w-full" onClick={removeSelected}>
          <Trash2 className="h-4 w-4" />
          Quitar de la pista
        </Button>
      ) : null}

      <div className="space-y-3 rounded-2xl border bg-card p-4">
        <div className="space-y-2">
          <Label htmlFor="play-name">Nombre de la jugada</Label>
          <Input
            id="play-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Recepción W · Rotación 1"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="play-team">Equipo (opcional)</Label>
          <select
            id="play-team"
            value={teamId}
            onChange={(event) => setTeamId(event.target.value)}
            className="flex h-11 w-full rounded-xl border border-input bg-card px-3 text-sm shadow-sm"
          >
            <option value="">Cualquiera</option>
            {teamOptions.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="play-notes">Notas</Label>
          <Textarea
            id="play-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Quién saca, movimiento del colocador…"
          />
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Button type="button" variant="accent" disabled={pending} onClick={onSave}>
            <Save className="h-4 w-4" />
            {play?.id ? "Guardar cambios" : "Guardar jugada"}
          </Button>
          {play?.id ? (
            <Button type="button" variant="destructive" disabled={pending} onClick={onDelete}>
              <Trash2 className="h-4 w-4" />
              Eliminar
            </Button>
          ) : null}
        </div>
      </div>

      <Sheet open={picker !== null} onOpenChange={(open) => !open && setPicker(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>
              {selected?.kind === "player" ? "Asignar jugador" : "Añadir a la pizarra"}
            </SheetTitle>
            <SheetDescription>
              Elige un jugador de la plantilla o un ficha genérica.
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-2 overflow-y-auto">
            <Button
              type="button"
              variant="secondary"
              className="w-full justify-start"
              onClick={() => addPlayer(picker ?? "us")}
            >
              Ficha genérica
            </Button>
            {roster.map((player) => (
              <Button
                key={player.id}
                type="button"
                variant="outline"
                className="w-full justify-start"
                onClick={() =>
                  selected?.kind === "player" ? assignSelected(player) : addPlayer(picker ?? "us", player)
                }
              >
                <span className="mr-2 font-black tabular-nums">
                  {formatJersey(player.jersey_number)}
                </span>
                {player.full_name}
              </Button>
            ))}
            {roster.length === 0 ? (
              <p className="px-1 text-sm text-muted-foreground">
                No hay jugadores en este equipo. Crea la plantilla o elige otro equipo.
              </p>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function CourtLines() {
  return (
    <svg viewBox="0 0 90 140" className="absolute inset-0 h-full w-full" aria-hidden>
      <defs>
        <linearGradient id="court-wood" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#e2a45d" />
          <stop offset="45%" stopColor="#c47b36" />
          <stop offset="100%" stopColor="#a86228" />
        </linearGradient>
        <pattern id="court-grain" width="90" height="10" patternUnits="userSpaceOnUse">
          <path
            d="M0 2.2 C 18 0.6 36 3.4 54 1.8 S 80 3 90 2.4"
            fill="none"
            stroke="#8a4d1d"
            strokeOpacity="0.22"
            strokeWidth="0.7"
          />
          <path
            d="M0 6.8 C 16 8.4 38 5.6 58 7.4 S 78 6.2 90 7"
            fill="none"
            stroke="#f0c48a"
            strokeOpacity="0.16"
            strokeWidth="0.55"
          />
        </pattern>
      </defs>
      <rect width="90" height="140" fill="url(#court-wood)" />
      <rect width="90" height="140" fill="url(#court-grain)" />
      <rect x="6" y="6" width="78" height="128" fill="none" stroke="#f7ecd4" strokeWidth="1.6" />
      <rect x="6" y="68.2" width="78" height="3.6" fill="#6b3a16" fillOpacity="0.55" />
      <line x1="6" y1="70" x2="84" y2="70" stroke="#f7ecd4" strokeWidth="2.2" />
      <line x1="6" y1="46.7" x2="84" y2="46.7" stroke="#f7ecd4" strokeWidth="1.15" strokeDasharray="3 2" />
      <line x1="6" y1="93.3" x2="84" y2="93.3" stroke="#f7ecd4" strokeWidth="1.15" strokeDasharray="3 2" />
      <text x="45" y="16" textAnchor="middle" fill="#5c3310" fillOpacity="0.55" fontSize="5" fontWeight="700">
        RIVAL
      </text>
      <text x="45" y="69.2" textAnchor="middle" fill="#f7ecd4" fontSize="4.5" fontWeight="800">
        RED
      </text>
      <text x="45" y="132" textAnchor="middle" fill="#5c3310" fillOpacity="0.55" fontSize="5" fontWeight="700">
        NOSOTROS
      </text>
    </svg>
  );
}
