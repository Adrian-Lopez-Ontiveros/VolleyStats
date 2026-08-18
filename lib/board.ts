export type BoardSide = "us" | "them";

export type BoardPlayerPiece = {
  id: string;
  kind: "player";
  playerId: string | null;
  name: string;
  jersey: number | null;
  team: BoardSide;
  x: number;
  y: number;
};

export type BoardBallPiece = {
  id: string;
  kind: "ball";
  x: number;
  y: number;
};

export const BOARD_GEAR_KINDS = ["cone", "box", "hoop", "ladder"] as const;

export type BoardGearKind = (typeof BOARD_GEAR_KINDS)[number];

export type BoardGearPiece = {
  id: string;
  kind: BoardGearKind;
  x: number;
  y: number;
};

export type BoardPiece = BoardPlayerPiece | BoardBallPiece | BoardGearPiece;

export const BOARD_GEAR_META: Record<BoardGearKind, { label: string; short: string }> = {
  cone: { label: "Cono", short: "Cono" },
  box: { label: "Cajón", short: "Cajón" },
  hoop: { label: "Aro", short: "Aro" },
  ladder: { label: "Escalera", short: "Escalera" },
};

export function isGearKind(value: unknown): value is BoardGearKind {
  return BOARD_GEAR_KINDS.includes(value as BoardGearKind);
}

export type BoardState = {
  pieces: BoardPiece[];
};

const US_SPOTS: { jersey: number; x: number; y: number }[] = [
  { jersey: 4, x: 0.22, y: 0.63 },
  { jersey: 3, x: 0.5, y: 0.63 },
  { jersey: 2, x: 0.78, y: 0.63 },
  { jersey: 5, x: 0.22, y: 0.86 },
  { jersey: 6, x: 0.5, y: 0.86 },
  { jersey: 1, x: 0.78, y: 0.86 },
];

const THEM_SPOTS: { jersey: number; x: number; y: number }[] = [
  { jersey: 2, x: 0.22, y: 0.37 },
  { jersey: 3, x: 0.5, y: 0.37 },
  { jersey: 4, x: 0.78, y: 0.37 },
  { jersey: 1, x: 0.22, y: 0.14 },
  { jersey: 6, x: 0.5, y: 0.14 },
  { jersey: 5, x: 0.78, y: 0.14 },
];

function pieceId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `p-${Math.random().toString(36).slice(2, 10)}`;
}

export function defaultBoard(): BoardState {
  const ours: BoardPlayerPiece[] = US_SPOTS.map((spot) => ({
    id: pieceId(),
    kind: "player",
    playerId: null,
    name: `P${spot.jersey}`,
    jersey: spot.jersey,
    team: "us",
    x: spot.x,
    y: spot.y,
  }));

  const theirs: BoardPlayerPiece[] = THEM_SPOTS.map((spot) => ({
    id: pieceId(),
    kind: "player",
    playerId: null,
    name: `R${spot.jersey}`,
    jersey: spot.jersey,
    team: "them",
    x: spot.x,
    y: spot.y,
  }));

  const ball: BoardBallPiece = {
    id: pieceId(),
    kind: "ball",
    x: 0.5,
    y: 0.5,
  };

  return { pieces: [...ours, ...theirs, ball] };
}

export function parseBoard(value: unknown): BoardState {
  if (!value || typeof value !== "object") return defaultBoard();
  const pieces = (value as { pieces?: unknown }).pieces;
  if (!Array.isArray(pieces)) return defaultBoard();

  const parsed: BoardPiece[] = [];
  for (const item of pieces) {
    if (!item || typeof item !== "object") continue;
    const piece = item as Record<string, unknown>;
    const x = clamp01(Number(piece.x));
    const y = clamp01(Number(piece.y));
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;

    if (piece.kind === "ball") {
      parsed.push({
        id: String(piece.id ?? pieceId()),
        kind: "ball",
        x,
        y,
      });
      continue;
    }

    if (isGearKind(piece.kind)) {
      parsed.push({
        id: String(piece.id ?? pieceId()),
        kind: piece.kind,
        x,
        y,
      });
      continue;
    }

    if (piece.kind === "player") {
      const jerseyRaw = piece.jersey;
      const jersey =
        typeof jerseyRaw === "number" && Number.isFinite(jerseyRaw)
          ? jerseyRaw
          : null;
      parsed.push({
        id: String(piece.id ?? pieceId()),
        kind: "player",
        playerId: typeof piece.playerId === "string" ? piece.playerId : null,
        name: typeof piece.name === "string" && piece.name.trim() ? piece.name : "Jugador",
        jersey,
        team: piece.team === "them" ? "them" : "us",
        x,
        y,
      });
    }
  }

  return { pieces: parsed };
}

export function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0.5;
  return Math.min(0.96, Math.max(0.04, value));
}

export function createPlayerPiece(
  input: {
    playerId?: string | null;
    name: string;
    jersey?: number | null;
    team: BoardSide;
    x?: number;
    y?: number;
  }
): BoardPlayerPiece {
  return {
    id: pieceId(),
    kind: "player",
    playerId: input.playerId ?? null,
    name: input.name,
    jersey: input.jersey ?? null,
    team: input.team,
    x: input.x ?? (input.team === "us" ? 0.5 : 0.5),
    y: input.y ?? (input.team === "us" ? 0.75 : 0.25),
  };
}

export function createBallPiece(x = 0.5, y = 0.5): BoardBallPiece {
  return { id: pieceId(), kind: "ball", x, y };
}

export function createGearPiece(kind: BoardGearKind, x?: number, y?: number): BoardGearPiece {
  return {
    id: pieceId(),
    kind,
    x: x ?? 0.5,
    y: y ?? 0.52,
  };
}

export function nextFreeSpot(pieces: BoardPiece[], kind: BoardPiece["kind"]) {
  const same = pieces.filter((piece) => piece.kind === kind).length;
  const ox = ((same % 5) - 2) * 0.08;
  const oy = Math.floor(same / 5) * 0.07;
  return {
    x: clamp01(0.5 + ox),
    y: clamp01(0.5 + oy),
  };
}
