import type { TeamCategory } from "@/lib/categories";
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
  const rounds = matches
    .filter((match) => Boolean(match.is_federation) && isCategoryMatch(match, category))
    .map((match) => ({ match, round: federationRoundNumber(match.federation_round) }))
    .filter((item): item is { match: (typeof matches)[number]; round: number } => item.round != null);

  const live = rounds.filter((item) => item.match.status === "live");
  if (live.length > 0) return Math.min(...live.map((item) => item.round));

  const open = rounds
    .filter((item) => item.match.status !== "finished" && item.match.status !== "cancelled")
    .sort(
      (a, b) =>
        scheduledTime(a.match.scheduled_at) - scheduledTime(b.match.scheduled_at) || a.round - b.round
    );
  if (open.length > 0) return open[0].round;

  const played = rounds.filter((item) => item.match.status !== "cancelled");
  if (played.length === 0) return null;
  return Math.max(...played.map((item) => item.round));
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
