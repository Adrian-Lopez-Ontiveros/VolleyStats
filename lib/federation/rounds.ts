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
