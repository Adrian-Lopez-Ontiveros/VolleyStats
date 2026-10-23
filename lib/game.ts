import { madridCalendarKey } from "@/lib/federation/schedule";

export const CHECKIN_BASE_XP = 10;
export const CHECKIN_PER_DAY_XP = 5;
export const CHECKIN_STREAK_CAP = 30;
export const PREDICTION_HIT_XP = 25;
export const JORNADA_PERFECT_XP = 50;
export const JORNADA_PERFECT_MIN = 2;
export const JERSEY_XP = 20;
export const PREDICTION_CUTOFF_MS = 5 * 60 * 1000;

export type RewardKind = "title" | "frame" | "badge" | "card";

export type GameReward = {
  id: string;
  kind: RewardKind;
  label: string;
  description: string;
  hint: string;
};

export const GAME_REWARDS: GameReward[] = [
  {
    id: "title_novato",
    kind: "title",
    label: "Novato",
    description: "Tu primer título al fichar en la app.",
    hint: "Entra un día",
  },
  {
    id: "title_aficionado",
    kind: "title",
    label: "Aficionado",
    description: "Ya formas parte del club.",
    hint: "Alcanza el nivel 2",
  },
  {
    id: "title_socio",
    kind: "title",
    label: "Socio",
    description: "Vienes para quedarte.",
    hint: "Alcanza el nivel 3",
  },
  {
    id: "title_hincha",
    kind: "title",
    label: "Hincha fiel",
    description: "Siempre en la grada.",
    hint: "Alcanza el nivel 5",
  },
  {
    id: "title_veterano",
    kind: "title",
    label: "Veterano",
    description: "Años de naranja y negro.",
    hint: "Alcanza el nivel 8",
  },
  {
    id: "title_leyenda",
    kind: "title",
    label: "Leyenda naranja",
    description: "Tu nombre suena en el pabellón.",
    hint: "Alcanza el nivel 10",
  },
  {
    id: "title_corazon",
    kind: "title",
    label: "Corazón Fuenla",
    description: "El club te late en el pecho.",
    hint: "Alcanza el nivel 15",
  },
  {
    id: "title_racha",
    kind: "title",
    label: "Racha de fuego",
    description: "Siete días seguidos en la app.",
    hint: "Racha de 7 días",
  },
  {
    id: "title_imparable",
    kind: "title",
    label: "Imparable",
    description: "Un mes entero sin fallar.",
    hint: "Racha de 30 días",
  },
  {
    id: "title_oraculo",
    kind: "title",
    label: "Oráculo",
    description: "Acertaste todos los partidos de una jornada.",
    hint: "Jornada perfecta",
  },
  {
    id: "title_profeta",
    kind: "title",
    label: "Profeta",
    description: "Diez pronósticos que se cumplieron.",
    hint: "10 predicciones acertadas",
  },
  {
    id: "title_exacto",
    kind: "title",
    label: "Exacto",
    description: "Tres marcadores clavados. El acierto de equipo no cuenta.",
    hint: "3 resultados exactos",
  },
  {
    id: "card_quiniela",
    kind: "card",
    label: "Cromo quiniela",
    description: "El cromo pasa a azul y verde azulado.",
    hint: "5 predicciones acertadas",
  },
  {
    id: "card_profeta",
    kind: "card",
    label: "Cromo profeta",
    description: "El cromo pasa a violeta.",
    hint: "10 predicciones acertadas",
  },
  {
    id: "card_vidente",
    kind: "card",
    label: "Cromo vidente",
    description: "El cromo pasa a verde esmeralda.",
    hint: "25 predicciones acertadas",
  },
  {
    id: "card_leyenda",
    kind: "card",
    label: "Cromo leyenda",
    description: "El cromo pasa a oro.",
    hint: "50 predicciones acertadas",
  },
  {
    id: "card_marcador",
    kind: "card",
    label: "Cromo marcador",
    description: "El cromo pasa a granate. Solo cuentan los resultados exactos.",
    hint: "5 resultados exactos",
  },
  {
    id: "card_pleno",
    kind: "card",
    label: "Cromo pleno",
    description: "El cromo pasa a escarlata. Solo cuentan los resultados exactos.",
    hint: "10 resultados exactos",
  },
  {
    id: "card_infalible",
    kind: "card",
    label: "Cromo infalible",
    description: "El cromo pasa a rubí. Solo cuentan los resultados exactos.",
    hint: "25 resultados exactos",
  },
  {
    id: "card_lider",
    kind: "card",
    label: "Cromo líder",
    description: "El borde arde. Solo puede llevarlo quien va primero. Si te superan, se te quita.",
    hint: "Ve primero en la clasificación",
  },
  {
    id: "frame_naranja",
    kind: "frame",
    label: "Marco naranja",
    description: "Aro de aficionado para tu foto.",
    hint: "Alcanza el nivel 4",
  },
  {
    id: "frame_violeta",
    kind: "frame",
    label: "Marco violeta",
    description: "El marco de quien ya pisa fuerte.",
    hint: "Alcanza el nivel 7",
  },
  {
    id: "frame_oro",
    kind: "frame",
    label: "Marco oro",
    description: "Brilla en el vestuario digital.",
    hint: "Alcanza el nivel 12",
  },
  {
    id: "frame_escarlata",
    kind: "frame",
    label: "Marco escarlata",
    description: "Aro de quien clava el marcador. El acierto de equipo no cuenta.",
    hint: "15 resultados exactos",
  },
  {
    id: "badge_checkin",
    kind: "badge",
    label: "Primer fichaje",
    description: "Entraste y reclamaste tu racha.",
    hint: "Entra un día",
  },
  {
    id: "badge_week",
    kind: "badge",
    label: "Semana completa",
    description: "Siete días de racha.",
    hint: "Racha de 7 días",
  },
  {
    id: "badge_month",
    kind: "badge",
    label: "Mes de racha",
    description: "Treinta días seguidos.",
    hint: "Racha de 30 días",
  },
  {
    id: "badge_first_pick",
    kind: "badge",
    label: "Primera predicción",
    description: "Te mojaste con un resultado.",
    hint: "Predice un partido",
  },
  {
    id: "badge_perfect",
    kind: "badge",
    label: "Jornada perfecta",
    description: "Pleno en una jornada del club.",
    hint: "Acierta toda una jornada",
  },
  {
    id: "badge_level5",
    kind: "badge",
    label: "Nivel 5",
    description: "Ya no eres de la cantera.",
    hint: "Alcanza el nivel 5",
  },
  {
    id: "badge_level10",
    kind: "badge",
    label: "Nivel 10",
    description: "Titular en el once de la app.",
    hint: "Alcanza el nivel 10",
  },
  {
    id: "badge_oracle",
    kind: "badge",
    label: "Vidente",
    description: "Veinticinco aciertos acumulados.",
    hint: "25 predicciones acertadas",
  },
  {
    id: "badge_marcador",
    kind: "badge",
    label: "Primer marcador",
    description: "Clavaste un resultado. Acertar solo el equipo no vale.",
    hint: "1 resultado exacto",
  },
];

export const REWARD_BY_ID = new Map(GAME_REWARDS.map((reward) => [reward.id, reward]));

export type RewardMetric = "checkin" | "level" | "streak" | "picks" | "hits" | "exact";

export type RewardStats = Record<RewardMetric, number>;

/**
 * Condición numérica de cada recompensa, espejo de game_unlock_rewards (038).
 * Sin entrada: no se puede calcular con los datos que ya carga la app
 * (jornada perfecta usa xp_events; líder depende de la clasificación).
 */
export const REWARD_GOALS: Record<string, { metric: RewardMetric; target: number }> = {
  title_novato: { metric: "checkin", target: 1 },
  badge_checkin: { metric: "checkin", target: 1 },
  title_aficionado: { metric: "level", target: 2 },
  title_socio: { metric: "level", target: 3 },
  frame_naranja: { metric: "level", target: 4 },
  title_hincha: { metric: "level", target: 5 },
  badge_level5: { metric: "level", target: 5 },
  frame_violeta: { metric: "level", target: 7 },
  title_veterano: { metric: "level", target: 8 },
  title_leyenda: { metric: "level", target: 10 },
  badge_level10: { metric: "level", target: 10 },
  frame_oro: { metric: "level", target: 12 },
  title_corazon: { metric: "level", target: 15 },
  title_racha: { metric: "streak", target: 7 },
  badge_week: { metric: "streak", target: 7 },
  title_imparable: { metric: "streak", target: 30 },
  badge_month: { metric: "streak", target: 30 },
  badge_first_pick: { metric: "picks", target: 1 },
  card_quiniela: { metric: "hits", target: 5 },
  title_profeta: { metric: "hits", target: 10 },
  card_profeta: { metric: "hits", target: 10 },
  badge_oracle: { metric: "hits", target: 25 },
  card_vidente: { metric: "hits", target: 25 },
  card_leyenda: { metric: "hits", target: 50 },
  badge_marcador: { metric: "exact", target: 1 },
  title_exacto: { metric: "exact", target: 3 },
  card_marcador: { metric: "exact", target: 5 },
  card_pleno: { metric: "exact", target: 10 },
  frame_escarlata: { metric: "exact", target: 15 },
  card_infalible: { metric: "exact", target: 25 },
};

export function rewardStats(
  progress: {
    xp: number;
    level: number;
    current_streak: number;
    longest_streak: number;
    last_checkin_on: string | null;
  },
  predictions: { is_correct: boolean | null; points?: number | null }[]
): RewardStats {
  return {
    checkin: progress.last_checkin_on || progress.current_streak > 0 || progress.xp > 0 ? 1 : 0,
    level: progress.level,
    streak: Math.max(progress.current_streak, progress.longest_streak),
    picks: predictions.length,
    hits: predictions.filter((row) => row.is_correct === true).length,
    exact: predictions.filter((row) => row.points === 2).length,
  };
}

/** Progreso de una recompensa, limitado al objetivo. null si no es medible. */
export function rewardProgress(id: string, stats: RewardStats, unlocked: boolean) {
  const goal = REWARD_GOALS[id];
  if (!goal) return null;
  const raw = Math.max(0, Math.floor(stats[goal.metric] ?? 0));
  const current = unlocked ? goal.target : Math.min(raw, goal.target);
  return { current, target: goal.target, done: unlocked || raw >= goal.target };
}

export function rewardLabel(id: string | null | undefined) {
  if (!id) return null;
  return REWARD_BY_ID.get(id)?.label ?? null;
}

export function xpForNextLevel(level: number) {
  return 100 + Math.max(0, level - 1) * 25;
}

export function progressFromXp(xp: number) {
  let level = 1;
  let remaining = Math.max(0, Math.floor(xp));
  let need = xpForNextLevel(level);
  while (remaining >= need && level < 99) {
    remaining -= need;
    level += 1;
    need = xpForNextLevel(level);
  }
  return {
    level,
    xpIntoLevel: remaining,
    xpForNext: need,
    totalXp: Math.max(0, Math.floor(xp)),
    ratio: need <= 0 ? 1 : Math.min(1, remaining / need),
  };
}

export function checkinXpForStreak(streak: number) {
  const days = Math.min(Math.max(1, streak), CHECKIN_STREAK_CAP);
  let gained = CHECKIN_BASE_XP + days * CHECKIN_PER_DAY_XP;
  if (streak === 7) gained += 40;
  if (streak === 14) gained += 80;
  if (streak === 30) gained += 150;
  return gained;
}

export function predictionLocksAt(scheduledAt: string) {
  const kickoff = new Date(scheduledAt).getTime();
  if (!Number.isFinite(kickoff)) return null;
  return kickoff - PREDICTION_CUTOFF_MS;
}

export function isPredictionLocked(scheduledAt: string, now = Date.now()) {
  const locksAt = predictionLocksAt(scheduledAt);
  if (locksAt == null) return true;
  return now >= locksAt;
}

export function jornadaKeyFromIso(scheduledAt: string) {
  const ymd = madridCalendarKey(scheduledAt);
  const [year, month, day] = ymd.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const weekday = date.getUTCDay() || 7;
  const thursday = new Date(date);
  thursday.setUTCDate(date.getUTCDate() + 4 - weekday);
  const isoYear = thursday.getUTCFullYear();
  const jan4 = new Date(Date.UTC(isoYear, 0, 4));
  const jan4Day = jan4.getUTCDay() || 7;
  const week1Monday = new Date(jan4);
  week1Monday.setUTCDate(jan4.getUTCDate() - jan4Day + 1);
  const week = 1 + Math.round((thursday.getTime() - week1Monday.getTime()) / (7 * 86400000));
  return `${isoYear}-W${String(week).padStart(2, "0")}`;
}

export function nearestJornadaKey(
  matches: { scheduled_at: string; status: string }[]
) {
  const upcoming = matches
    .filter((match) => match.status === "scheduled" || match.status === "live")
    .sort(
      (a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
    );
  return upcoming[0] ? jornadaKeyFromIso(upcoming[0].scheduled_at) : null;
}

export function jornadaRangeLabel(scheduledAts: string[]) {
  if (scheduledAts.length === 0) return "Jornada";
  const days = scheduledAts
    .map((iso) => madridCalendarKey(iso))
    .sort();
  const first = days[0];
  const last = days[days.length - 1];
  const format = (ymd: string) => {
    const [, month, day] = ymd.split("-");
    return `${Number(day)}/${Number(month)}`;
  };
  if (first === last) return `Jornada · ${format(first)}`;
  return `Jornada · ${format(first)} – ${format(last)}`;
}

export const FRAME_NONE = "frame_none";

// Colores fijos en app/globals.css (.reward-frame-*): ningún tema de color de Ajustes los toca.
export const FRAME_CLASS: Record<string, string> = {
  frame_naranja: "reward-frame reward-frame-naranja",
  frame_violeta: "reward-frame reward-frame-violeta",
  frame_oro: "reward-frame reward-frame-oro",
  frame_escarlata: "reward-frame reward-frame-escarlata",
};

/** «2026-10» del mes natural en hora de Madrid. */
export function madridMonthKey(iso: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date(iso));
  const year = parts.find((p) => p.type === "year")?.value ?? "0000";
  const month = parts.find((p) => p.type === "month")?.value ?? "01";
  return `${year}-${month}`;
}

/** «octubre de 2026» en hora de Madrid. */
export function madridMonthLabel(date: Date) {
  return new Intl.DateTimeFormat("es-ES", {
    timeZone: "Europe/Madrid",
    month: "long",
    year: "numeric",
  }).format(date);
}

/** Retos diarios (migración 046). La XP la concede game_daily_challenges() una vez al día. */
export const DAILY_CHALLENGES = [
  {
    id: "entrar",
    label: "Entra hoy en la app",
    hint: "Se completa solo al abrir la app.",
    xp: 10,
  },
  {
    id: "predecir",
    label: "Haz tus predicciones",
    hint: "Pronostica todos los partidos abiertos de la jornada.",
    xp: 20,
  },
  {
    id: "comentar",
    label: "Comenta una noticia",
    hint: "Deja un comentario en cualquier noticia.",
    xp: 10,
  },
  {
    id: "exacto",
    label: "Acierta un resultado exacto",
    hint: "Cuenta si hoy se resuelve un pronóstico con el marcador exacto.",
    xp: 30,
  },
] as const;

export type DailyChallengeId = (typeof DAILY_CHALLENGES)[number]["id"];

export type DailyChallengeStatus = {
  id: DailyChallengeId;
  label: string;
  hint: string;
  xp: number;
  done: boolean;
  claimed: boolean;
};
