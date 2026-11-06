import { matchScoreFromSets, parseManualSetScores } from "@/lib/match-result";
import { datetimeLocalMadridToIso } from "@/lib/federation/schedule";
import {
  computeStandings,
  emptyPlayerSample,
  leaguePointsForResult,
  applyPointType,
  type MatchStandingInput,
  type StandingRow,
} from "@/lib/stats";
import type { Team, Match, PointType, MatchEvent, PlayerPosition } from "@/lib/types";

export type PrivateMatchStats = {
  points: number;
  attackPoints: number;
  blockPoints: number;
  aces: number;
  errors: number;
  attackKills: number;
  attackErrors: number;
  attackContinuations: number;
  serveErrors: number;
  serveIn: number;
  receptionGood: number;
  receptionMedium: number;
  receptionBad: number;
  receptionErrors: number;
  defenseGood: number;
  defenseMedium: number;
  defenseBad: number;
  defenseErrors: number;
};

export function privatePlayerStats(events: Pick<MatchEvent, "point_type">[]): PrivateMatchStats {
  const sample = emptyPlayerSample("", "");
  for (const event of events) applyPointType(sample, event.point_type as PointType);
  return {
    points: sample.points,
    attackPoints: sample.attacks,
    blockPoints: sample.blocks,
    aces: sample.aces,
    errors: sample.errors,
    attackKills: sample.attackKills,
    attackErrors: sample.attackErrors,
    attackContinuations: sample.attackContinuations,
    serveErrors: sample.serveErrors,
    serveIn: sample.serveIn,
    receptionGood: sample.receptionGood,
    receptionMedium: sample.receptionMedium,
    receptionBad: sample.receptionBad,
    receptionErrors: sample.receptionErrors,
    defenseGood: sample.defenseGood,
    defenseMedium: sample.defenseMedium,
    defenseBad: sample.defenseBad,
    defenseErrors: sample.defenseErrors,
  };
}

/** Solo resultados completos y filas ya limitadas a liga privada por la consulta llamante. */
export function privateLeagueStandings(teams: Team[], matches: Match[]): StandingRow[] {
  const valid = matches.filter((match) =>
    match.is_private === true && match.private_league_id === matches.find((item) => item.private_league_id != null)?.private_league_id &&
    match.status === "finished" && match.home_sets !== match.away_sets &&
    ((match.home_sets === 3 && match.away_sets <= 2) || (match.away_sets === 3 && match.home_sets <= 2))
  ).sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));
  return computeStandings(teams, valid as MatchStandingInput[]);
}

export { leaguePointsForResult };

export function privateMatchScore(formData: FormData, existing: Match) {
  const parsed = parseManualSetScores(formData, 3);
  if (parsed.error) return { error: parsed.error } as const;
  if (parsed.scores.length < 3) return { error: "Introduce los 3, 4 o 5 sets jugados." } as const;
  const result = matchScoreFromSets(parsed.scores, existing.status, 3);
  if (result.status !== "finished") return { error: "El partido aún no está decidido: uno de los equipos debe ganar 3 sets." } as const;
  return { result } as const;
}

export function privateScheduledAt(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim();
  return raw ? datetimeLocalMadridToIso(raw) : new Date().toISOString();
}

export type PrivateRosterInput = {
  full_name: string;
  jersey_number: number | null;
  position: PlayerPosition | null;
};

export function isPrivateRosterTeam(team: Pick<Team, "is_one_off">): boolean {
  return team.is_one_off !== true;
}
