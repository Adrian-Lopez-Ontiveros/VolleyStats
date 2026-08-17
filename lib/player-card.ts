import type {
  CardNameMode,
  PlayerCard,
  PlayerCardStats,
  PlayerPosition,
  SessionUser,
} from "@/lib/types";

export const CARD_STAT_KEYS = [
  "jump",
  "attack",
  "block",
  "serve",
  "reception",
  "defense",
] as const;

export type CardStatKey = (typeof CARD_STAT_KEYS)[number];

export const CARD_STAT_META: Record<CardStatKey, { label: string; short: string }> = {
  jump: { label: "Salto", short: "SAL" },
  attack: { label: "Ataque", short: "ATA" },
  block: { label: "Bloqueo", short: "BLO" },
  serve: { label: "Saque", short: "SAQ" },
  reception: { label: "Recepción", short: "REC" },
  defense: { label: "Defensa", short: "DEF" },
};

export const DEFAULT_CARD_STATS: PlayerCardStats = {
  jump: 50,
  attack: 50,
  block: 50,
  serve: 50,
  reception: 50,
  defense: 50,
};

export const POSITION_SHORT: Record<PlayerPosition, string> = {
  opuesto: "OPP",
  central: "CEN",
  receptor: "REC",
  colocador: "COL",
  libero: "LIB",
  universal: "UNI",
};

const POSITION_WEIGHTS: Record<PlayerPosition, Record<CardStatKey, number>> = {
  central: { jump: 22, attack: 18, block: 28, serve: 10, reception: 8, defense: 14 },
  receptor: { jump: 16, attack: 24, block: 10, serve: 14, reception: 20, defense: 16 },
  opuesto: { jump: 20, attack: 30, block: 14, serve: 18, reception: 6, defense: 12 },
  colocador: { jump: 12, attack: 10, block: 10, serve: 18, reception: 16, defense: 34 },
  libero: { jump: 6, attack: 4, block: 4, serve: 8, reception: 40, defense: 38 },
  universal: { jump: 17, attack: 17, block: 16, serve: 16, reception: 17, defense: 17 },
};

const EVEN_WEIGHTS: Record<CardStatKey, number> = {
  jump: 1,
  attack: 1,
  block: 1,
  serve: 1,
  reception: 1,
  defense: 1,
};

export function clampCardStat(value: number) {
  if (!Number.isFinite(value)) return 50;
  return Math.min(99, Math.max(1, Math.round(value)));
}

export function calculateCardRating(
  stats: PlayerCardStats,
  position?: PlayerPosition | null,
  override?: number | null
) {
  if (override != null) return clampCardStat(override);

  const weights = position ? POSITION_WEIGHTS[position] : EVEN_WEIGHTS;
  let total = 0;
  let weightSum = 0;
  for (const key of CARD_STAT_KEYS) {
    total += clampCardStat(stats[key]) * weights[key];
    weightSum += weights[key];
  }
  return clampCardStat(total / weightSum);
}

export type CardPhotoFrame = {
  x: number;
  y: number;
  zoom: number;
};

export const DEFAULT_PHOTO_FRAME: CardPhotoFrame = { x: 50, y: 18, zoom: 1 };

export const CARD_NAME_MODE_LABELS: Record<CardNameMode, string> = {
  last: "Solo apellido",
  full: "Nombre completo",
  custom: "Personalizado",
};

export function clampPhotoFocus(value: number) {
  if (!Number.isFinite(value)) return 50;
  return Math.min(100, Math.max(0, Math.round(value * 10) / 10));
}

export function clampPhotoZoom(value: number) {
  if (!Number.isFinite(value)) return 1;
  return Math.min(2.5, Math.max(1, Math.round(value * 100) / 100));
}

export function photoFrameFromCard(card?: PlayerCard | null): CardPhotoFrame {
  return {
    x: clampPhotoFocus(Number(card?.photo_focus_x ?? DEFAULT_PHOTO_FRAME.x)),
    y: clampPhotoFocus(Number(card?.photo_focus_y ?? DEFAULT_PHOTO_FRAME.y)),
    zoom: clampPhotoZoom(Number(card?.photo_zoom ?? DEFAULT_PHOTO_FRAME.zoom)),
  };
}

export function cardDisplayName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "JUGADOR";
  if (parts.length === 1) return parts[0].toLocaleUpperCase("es");

  const particles = new Set(["de", "del", "la", "las", "los", "y", "da", "do", "van", "von"]);
  let start = parts.length - 1;
  while (start > 0 && particles.has(parts[start - 1].toLocaleLowerCase("es"))) {
    start -= 1;
  }
  return parts.slice(start).join(" ").toLocaleUpperCase("es");
}

export function resolveCardName(
  fullName: string,
  mode?: CardNameMode | null,
  custom?: string | null
) {
  if (mode === "custom") {
    const customName = custom?.trim();
    if (customName) return customName.toLocaleUpperCase("es");
  }
  if (mode === "full") {
    const complete = fullName.trim();
    if (complete) return complete.toLocaleUpperCase("es");
  }
  return cardDisplayName(fullName);
}

export function cardPhotoUrl(card?: Pick<PlayerCard, "photo_url"> | null, avatarUrl?: string | null) {
  return card?.photo_url || avatarUrl || null;
}

export function cardPosition(
  card?: Pick<PlayerCard, "position"> | null,
  rosterPosition?: PlayerPosition | null
) {
  return card?.position ?? rosterPosition ?? null;
}

export function canManagePlayerCard(session: SessionUser | null | undefined, playerId: string) {
  if (!session) return false;
  if (session.profile.role === "admin") return true;
  return session.profile.player?.id === playerId;
}

export type CardTier = "gold" | "rare" | "silver" | "bronze";

export function cardTier(rating: number | null): CardTier {
  if (rating == null) return "bronze";
  if (rating >= 85) return "gold";
  if (rating >= 75) return "rare";
  if (rating >= 65) return "silver";
  return "bronze";
}

export function statValueTone(value: number, onDark = false) {
  if (onDark) {
    if (value >= 90) return "text-emerald-300";
    if (value >= 80) return "text-lime-300";
    if (value >= 70) return "text-amber-200";
    if (value >= 60) return "text-orange-200";
    return "text-rose-200";
  }
  if (value >= 90) return "text-emerald-600";
  if (value >= 80) return "text-lime-600";
  if (value >= 70) return "text-amber-600";
  if (value >= 60) return "text-orange-600";
  return "text-rose-600";
}

export function statsFromCard(card?: PlayerCard | null): PlayerCardStats | null {
  if (!card) return null;
  return {
    jump: card.jump,
    attack: card.attack,
    block: card.block,
    serve: card.serve,
    reception: card.reception,
    defense: card.defense,
  };
}
