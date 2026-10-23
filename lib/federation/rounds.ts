import type { TeamCategory } from "@/lib/categories";
import { madridCalendarKey } from "@/lib/federation/schedule";
import { computeStandings, type StandingRow } from "@/lib/stats";
import type { MatchWithTeams } from "@/lib/types";

export const JORNADA_MAX = 22;

export function federationRoundNumber(round: string | null | undefined): number | null {
  if (!round) return null;
  const match = round.match(/\d+/);
  if (!match) return null;
  const value = Number(match[0]);
  if (!Number.isInteger(value) || value < 1) return null;
  return value;
}

export function parseJornadaParam(value: string | null | undefined): number | null {
  if (!value) return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > JORNADA_MAX) return null;
  return parsed;
}

function scheduledTime(value: string | null | undefined) {
  if (!value) return Number.POSITIVE_INFINITY;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : Number.POSITIVE_INFINITY;
}

export function currentJornadaNumber(
  matches: readonly Pick<
    MatchWithTeams,
    "status" | "scheduled_at" | "federation_round" | "is_federation" | "home_team" | "away_team"
  >[],
  category: TeamCategory
): number | null {
  return currentJornadaFromRounds(
    matches.filter((match) => Boolean(match.is_federation) && isCategoryMatch(match, category))
  );
}

type RoundMatch = Pick<MatchWithTeams, "status" | "scheduled_at" | "federation_round">;

/** Semana (lunes a domingo, hora de Madrid) como "YYYY-MM-DD" del lunes. Ordenable como texto. */
export function madridWeekKey(iso: string | Date): string | null {
  const date = typeof iso === "string" ? new Date(iso) : iso;
  if (!Number.isFinite(date.getTime())) return null;
  const [year, month, day] = madridCalendarKey(date.toISOString()).split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day));
  const weekday = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() - weekday + 1);
  return utc.toISOString().slice(0, 10);
}

/**
 * Semana oficial de cada jornada: la semana en la que se juega la mayoría de sus partidos.
 * Así un partido adelantado o atrasado no arrastra la jornada a otra semana.
 * En empate gana la semana más temprana.
 */
export function jornadaOfficialWeeks(matches: readonly RoundMatch[]): Map<number, string> {
  const counts = new Map<number, Map<string, number>>();
  for (const match of matches) {
    if (match.status === "cancelled") continue;
    const round = federationRoundNumber(match.federation_round);
    const week = match.scheduled_at ? madridWeekKey(match.scheduled_at) : null;
    if (round == null || !week) continue;
    const byWeek = counts.get(round) ?? new Map<string, number>();
    byWeek.set(week, (byWeek.get(week) ?? 0) + 1);
    counts.set(round, byWeek);
  }
  const result = new Map<number, string>();
  for (const [round, byWeek] of counts) {
    const [week] = [...byWeek.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
    result.set(round, week);
  }
  return result;
}

/**
 * Jornada de esta semana: la jornada cuya semana oficial contiene hoy (Madrid).
 * Si esta semana no hay jornada, la próxima; si la temporada ya acabó, la última.
 */
export function currentJornadaFromRounds(
  matches: readonly RoundMatch[],
  now: Date = new Date()
): number | null {
  const weeks = jornadaOfficialWeeks(matches);
  if (weeks.size === 0) return null;
  const today = madridWeekKey(now);
  if (!today) return null;
  const entries = [...weeks.entries()].sort((a, b) => a[1].localeCompare(b[1]) || a[0] - b[0]);
  const thisWeek = entries.find(([, week]) => week === today);
  if (thisWeek) return thisWeek[0];
  const next = entries.find(([, week]) => week > today);
  if (next) return next[0];
  return Math.max(...weeks.keys());
}

export type JornadaMatchNote = { round: number; kind: "adelantado" | "atrasado" };

/**
 * Partidos que se ven al elegir una jornada: los suyos más los de otras jornadas que
 * se juegan en su semana oficial (adelantados o atrasados), con una nota para marcarlos.
 * Un partido de la jornada jugado fuera de su semana se sigue viendo aquí, también marcado.
 */
export function jornadaViewMatches<T extends RoundMatch & { id: string }>(
  matches: readonly T[],
  jornada: number
): { matches: T[]; notes: Record<string, string> } {
  const weeks = jornadaOfficialWeeks(matches);
  const week = weeks.get(jornada) ?? null;
  const notes: Record<string, string> = {};
  const list: T[] = [];
  for (const match of matches) {
    const round = federationRoundNumber(match.federation_round);
    if (round == null) continue;
    const own = round === jornada;
    const playedWeek = match.scheduled_at ? madridWeekKey(match.scheduled_at) : null;
    const official = weeks.get(round) ?? null;
    const outOfWeek = Boolean(playedWeek && official && playedWeek !== official);
    if (!own && !(week && outOfWeek && playedWeek === week)) continue;
    if (outOfWeek && playedWeek && official) {
      notes[match.id] = `J${round} ${playedWeek < official ? "adelantado" : "atrasado"}`;
    }
    list.push(match);
  }
  list.sort(
    (a, b) => scheduledTime(a.scheduled_at) - scheduledTime(b.scheduled_at)
  );
  return { matches: list, notes };
}

export function isCategoryMatch(
  match: Pick<MatchWithTeams, "home_team" | "away_team">,
  category: TeamCategory
) {
  return match.home_team.category === category || match.away_team.category === category;
}

export function standingsFromLeagueMatches(
  matches: MatchWithTeams[],
  jornada: number | null
): { rows: StandingRow[]; unfinished: number } {
  const teams = new Map<string, MatchWithTeams["home_team"]>();
  for (const match of matches) {
    teams.set(match.home_team.id, match.home_team);
    teams.set(match.away_team.id, match.away_team);
  }

  const through =
    jornada == null
      ? matches
      : matches.filter((match) => {
          const round = federationRoundNumber(match.federation_round);
          return round != null && round <= jornada;
        });

  const unfinished = through.filter(
    (match) => match.status !== "finished" && match.status !== "cancelled"
  ).length;

  return {
    rows: computeStandings([...teams.values()], through),
    unfinished,
  };
}

export function standingsThroughJornada(
  matches: MatchWithTeams[],
  category: TeamCategory,
  jornada: number | null
) {
  const league = matches.filter(
    (match) => Boolean(match.is_federation) && isCategoryMatch(match, category)
  );
  return standingsFromLeagueMatches(league, jornada);
}
