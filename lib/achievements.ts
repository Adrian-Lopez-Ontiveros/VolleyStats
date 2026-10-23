// Logros por estadísticas reales de la temporada (desde el 1 de agosto, hora de Madrid).
// Se calculan desde match_events: no necesitan tablas nuevas ni dan XP.
import { buildPlayerMatchSeries } from "@/lib/stats";
import type { PointType } from "@/lib/types";

export type StatAchievementMetric = "aces" | "points" | "blocks" | "attackKills" | "matches" | "receptions";

export type StatAchievementDef = {
  id: string;
  label: string;
  description: string;
  emoji: string;
  metric: StatAchievementMetric;
  target: number;
};

export const STAT_ACHIEVEMENTS: StatAchievementDef[] = [
  { id: "ace_10", label: "Saque bomba", description: "10 aces en la temporada", emoji: "🎯", metric: "aces", target: 10 },
  { id: "ace_25", label: "Rey del saque", description: "25 aces en la temporada", emoji: "👑", metric: "aces", target: 25 },
  { id: "pts_50", label: "Anotador", description: "50 puntos en la temporada", emoji: "🏐", metric: "points", target: 50 },
  { id: "pts_150", label: "Máquina de puntos", description: "150 puntos en la temporada", emoji: "💥", metric: "points", target: 150 },
  { id: "atk_40", label: "Rematador", description: "40 remates ganadores", emoji: "⚡", metric: "attackKills", target: 40 },
  { id: "blk_10", label: "Muro", description: "10 bloqueos punto", emoji: "🧱", metric: "blocks", target: 10 },
  { id: "rec_50", label: "Pase perfecto", description: "50 recepciones buenas", emoji: "🧤", metric: "receptions", target: 50 },
  { id: "mt_10", label: "Fijo en la pista", description: "10 partidos con estadísticas", emoji: "📅", metric: "matches", target: 10 },
];

export type StatAchievementProgress = StatAchievementDef & { value: number; done: boolean };

/** Inicio de la temporada actual: 1 de agosto (Madrid) del año en curso o del anterior. */
export function seasonStart(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(now);
  const year = Number(parts.find((p) => p.type === "year")?.value);
  const month = Number(parts.find((p) => p.type === "month")?.value);
  const startYear = month >= 8 ? year : year - 1;
  // 1 de agosto 00:00 en Madrid = 31 de julio 22:00 UTC (horario de verano).
  return new Date(Date.UTC(startYear, 6, 31, 22, 0, 0));
}

type EventLike = {
  match_id: string;
  point_type: PointType;
  created_at: string;
  match?: { scheduled_at?: string | null; status?: string | null } | null;
};

export function statAchievements(events: EventLike[], now = new Date()): StatAchievementProgress[] {
  const from = seasonStart(now).getTime();
  const season = events.filter((event) => {
    const when = event.match?.scheduled_at || event.created_at;
    return new Date(when).getTime() >= from;
  });
  const series = buildPlayerMatchSeries(season);
  const totals: Record<StatAchievementMetric, number> = {
    aces: 0,
    points: 0,
    blocks: 0,
    attackKills: 0,
    receptions: 0,
    matches: series.length,
  };
  for (const sample of series) {
    totals.aces += sample.aces;
    totals.points += sample.points;
    totals.blocks += sample.blocks;
    totals.attackKills += sample.attackKills;
    totals.receptions += sample.receptionGood;
  }
  return STAT_ACHIEVEMENTS.map((def) => {
    const value = totals[def.metric];
    return { ...def, value, done: value >= def.target };
  });
}
