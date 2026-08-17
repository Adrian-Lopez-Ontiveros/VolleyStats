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
import { BoardPieceVisual, CourtLines, pieceLabel } from "@/components/coach/board-markers";
import {
  BOARD_GEAR_KINDS,
  BOARD_GEAR_META,
  clamp01,
  createBallPiece,
  createGearPiece,
  createPlayerPiece,
  defaultBoard,
  nextFreeSpot,
  parseBoard,
  type BoardGearKind,
  type BoardPiece,
  type BoardPlayerPiece,
  type BoardSide,
  type BoardState,
} from "@/lib/board";
import { firstName } from "@/lib/court";
import { cn, formatJersey } from "@/lib/utils";
import type { Player, TacticalPlay, Team, Training } from "@/lib/types";

type RosterPlayer = Pick<Player, "id" | "full_name" | "jersey_number" | "team_id">;

export function TacticalBoard({
  play,
  plays,
  teams,
  players,
  trainings = [],
  defaultTrainingId = "",
  defaultName = "",
  defaultTeamId = "",
}: {
  play?: TacticalPlay | null;
  plays: TacticalPlay[];
  teams: Team[];
  players: RosterPlayer[];
  trainings?: Pick<Training, "id" | "name" | "scheduled_at">[];
  defaultTrainingId?: string;
  defaultName?: string;
  defaultTeamId?: string;
}) {
  const router = useRouter();
  const courtRef = useRef<HTMLDivElement>(null);
  const [board, setBoard] = useState<BoardState>(() =>
    play ? parseBoard(play.board) : defaultBoard()
  );
  const [name, setName] = useState(play?.name ?? defaultName);
  const [notes, setNotes] = useState(play?.notes ?? "");
  const [teamId, setTeamId] = useState(play?.team_id ?? defaultTeamId);
  const [trainingId, setTrainingId] = useState(play?.training_id ?? defaultTrainingId ?? "");
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
    const spot = nextFreeSpot(board.pieces, "ball");
    setBoard((current) => ({
      pieces: [...current.pieces, createBallPiece(spot.x, spot.y)],
    }));
  }

  function addGear(kind: BoardGearKind) {
    const spot = nextFreeSpot(board.pieces, kind);
    setBoard((current) => ({
      pieces: [...current.pieces, createGearPiece(kind, spot.x, spot.y)],
    }));
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
      trainingId,
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
        <CourtLines uid="editor" />
        {board.pieces.map((piece) => (
          <button
            key={piece.id}
            type="button"
            className={cn(
              "absolute z-10 -translate-x-1/2 -translate-y-1/2 touch-none appearance-none border-0 bg-transparent p-0 leading-none",
              piece.kind === "ball"
                ? "flex h-10 w-10 items-center justify-center sm:h-11 sm:w-11"
                : "flex items-center justify-center",
              selectedId === piece.id && "z-20"
            )}
            style={{ left: `${piece.x * 100}%`, top: `${piece.y * 100}%` }}
            onPointerDown={(event) => onPiecePointerDown(event, piece.id)}
            onPointerMove={onPiecePointerMove}
            onPointerUp={onPiecePointerUp}
            onPointerCancel={onPiecePointerUp}
          >
            <BoardPieceVisual piece={piece} selected={selectedId === piece.id} />
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
          <div className="min-h-0 flex-1 px-3">{court}</div>
          <div className="grid grid-cols-5 gap-1 px-3 pb-3 pt-2">
            <Button type="button" size="sm" variant="secondary" className="px-1 text-[10px]" onClick={addBall}>
              Balón
            </Button>
            {BOARD_GEAR_KINDS.map((kind) => (
              <Button
                key={kind}
                type="button"
                size="sm"
                variant="secondary"
                className="px-1 text-[10px]"
                onClick={() => addGear(kind)}
              >
                {BOARD_GEAR_META[kind].short}
              </Button>
            ))}
          </div>
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
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/volleyball.png" alt="" className="h-4 w-4 object-contain" /> Balón
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-3 w-2.5 bg-orange-500 [clip-path:polygon(50%_0,100%_100%,0_100%)]" /> Cono
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2.5 w-3.5 rounded-[2px] bg-amber-700" /> Cajón
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-3 w-3 rounded-full border-2 border-sky-400" /> Aro
        </span>
        {selected ? (
          <span className="font-medium text-foreground">Seleccionado: {pieceLabel(selected)}</span>
        ) : null}
      </div>

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-3">
        <Button type="button" variant="secondary" size="sm" onClick={() => setPicker("us")}>
          <Users className="h-4 w-4" />
          Jugador
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={() => addPlayer("them")}>
          <Plus className="h-4 w-4" />
          Rival
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

      <div className="grid grid-cols-5 gap-2">
        <Button type="button" variant="outline" size="sm" className="px-1 text-xs" onClick={addBall}>
          Balón
        </Button>
        {BOARD_GEAR_KINDS.map((kind) => (
          <Button
            key={kind}
            type="button"
            variant="outline"
            size="sm"
            className="px-1 text-xs"
            onClick={() => addGear(kind)}
          >
            {BOARD_GEAR_META[kind].short}
          </Button>
        ))}
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
          <Label htmlFor="play-training">Entrenamiento (opcional)</Label>
          <select
            id="play-training"
            value={trainingId}
            onChange={(event) => setTrainingId(event.target.value)}
            className="flex h-11 w-full rounded-xl border border-input bg-card px-3 text-sm shadow-sm"
          >
            <option value="">Sin vincular</option>
            {trainings.map((training) => (
              <option key={training.id} value={training.id}>
                {training.name}
              </option>
            ))}
          </select>
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
