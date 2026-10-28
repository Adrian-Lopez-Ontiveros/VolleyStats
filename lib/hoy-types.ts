import type { DailyChallengeStatus } from "@/lib/game";
import type { NewsSocialData } from "@/lib/news-social";
import type { ClubNews } from "@/lib/types";

export type HoyTeamSide = {
  name: string;
  shortName: string | null;
  logoUrl: string | null;
  federationTeamId: string | null;
  isClub: boolean;
};

export type HoyMatch = {
  id: string;
  home: HoyTeamSide;
  away: HoyTeamSide;
  scheduledAt: string;
  whenLabel: string;
  /** Hora fija (no «fin de semana» sin hora): se puede mostrar cuenta atrás. */
  hasTime: boolean;
  isToday: boolean;
  place: string | null;
  homeSets: number;
  awaySets: number;
  status: string;
  /** Desde el punto de vista del equipo del jugador. */
  won: boolean | null;
  categoryLabel: string;
};

export type HoyStatLine = { label: string; value: number; average: number };

export type HoyData = {
  /** Espectador sin sesión: solo bloques públicos del club. */
  isGuest?: boolean;
  firstName: string;
  streak: number;
  longestStreak: number;
  level: number;
  xp: number;
  teamName: string | null;
  nextMatch: HoyMatch | null;
  predictions: {
    missing: number;
    open: number;
    label: string;
    /** Primer partido sin pronosticar (ancla #pred-<id> en /predicciones). */
    firstMissingId: string | null;
  } | null;
  challenges: DailyChallengeStatus[] | null;
  challengesXpToday: number;
  lastMatch: (HoyMatch & { stats: HoyStatLine[] | null }) | null;
  standing: {
    position: number;
    total: number;
    points: number;
    played: number;
    jornada: number | null;
    categoryLabel: string;
  } | null;
  clubResults: HoyMatch[];
  news: {
    id: string;
    title: string;
    excerpt: string;
    coverUrl: string | null;
    publishedAt: string;
    /** Noticia completa, para pintar la misma NewsCard que /noticias. */
    item?: ClubNews;
    /** Reacciones y comentarios; null si falta la migración 045. */
    social?: NewsSocialData | null;
  } | null;
};
