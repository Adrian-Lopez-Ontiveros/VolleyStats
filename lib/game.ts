import { madridCalendarKey } from "@/lib/federation/schedule";

export const CHECKIN_BASE_XP = 10;
export const CHECKIN_PER_DAY_XP = 5;
export const CHECKIN_STREAK_CAP = 30;
export const PREDICTION_HIT_XP = 25;
export const JORNADA_PERFECT_XP = 50;
export const JORNADA_PERFECT_MIN = 2;
export const JERSEY_XP = 20;

export type RewardKind = "title" | "frame" | "badge";

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
];

export const REWARD_BY_ID = new Map(GAME_REWARDS.map((reward) => [reward.id, reward]));

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

export const FRAME_CLASS: Record<string, string> = {
  frame_naranja: "bg-gradient-to-br from-orange-400 to-orange-600 p-[3px] shadow-[0_0_0_1px_rgba(234,88,12,0.35)]",
  frame_violeta: "bg-gradient-to-br from-violet-400 to-fuchsia-600 p-[3px] shadow-[0_0_0_1px_rgba(124,58,237,0.35)]",
  frame_oro: "bg-gradient-to-br from-amber-200 via-yellow-400 to-amber-600 p-[3px] shadow-[0_0_12px_rgba(251,191,36,0.55)]",
};
