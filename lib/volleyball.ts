import {
  DECIDING_SET_POINTS,
  MIN_LEAD,
  REGULAR_SET_POINTS,
  SETS_TO_WIN,
  maxSetsOf,
  setsToWinOf,
} from "@/lib/constants";
import type { MatchEvent, PointType, SetScore } from "@/lib/types";

export { maxSetsOf, setsToWinOf };

const OWN_ERROR_TYPES: PointType[] = [
  "error",
  "attack_error",
  "serve_error",
  "reception_error",
  "defense_error",
  "block_error",
];

/** Punto para el rival que no es un error nuestro (no suma en errores del jugador). */
const OPPONENT_SCORE_TYPES: PointType[] = ["opponent_point"];

const NON_SCORING_TYPES: PointType[] = [
  "attack_continuation",
  "serve_in",
  "reception_good",
  "reception_medium",
  "reception_bad",
  "defense_good",
  "defense_medium",
  "defense_bad",
  "block_touch",
  "block_continuation",
];

export function isScoringAction(pointType: PointType) {
  return !NON_SCORING_TYPES.includes(pointType);
}

export function isOwnErrorType(pointType: PointType) {
  return OWN_ERROR_TYPES.includes(pointType);
}

export function scoresForActingTeam(pointType: PointType) {
  if (OPPONENT_SCORE_TYPES.includes(pointType)) return false;
  return !isOwnErrorType(pointType);
}

export function resolveScoringTeam(
  actingTeamId: string,
  homeTeamId: string,
  awayTeamId: string,
  pointType: PointType
): string | null {
  if (!isScoringAction(pointType)) return null;
  const opponentId = actingTeamId === homeTeamId ? awayTeamId : homeTeamId;
  return scoresForActingTeam(pointType) ? actingTeamId : opponentId;
}

export function targetPointsForSet(setNumber: number, setsToWin = SETS_TO_WIN) {
  return setNumber >= maxSetsOf(setsToWin) ? DECIDING_SET_POINTS : REGULAR_SET_POINTS;
}

export function isSetWon(
  home: number,
  away: number,
  setNumber: number,
  setsToWin = SETS_TO_WIN
) {
  const target = targetPointsForSet(setNumber, setsToWin);
  const leader = Math.max(home, away);
  const trailer = Math.min(home, away);
  return leader >= target && leader - trailer >= MIN_LEAD;
}

export type ComputedMatchState = {
  homeSets: number;
  awaySets: number;
  currentSet: number;
  homePoints: number;
  awayPoints: number;
  setScores: SetScore[];
  status: "live" | "finished";
};

export type EventWithSetScore<T> = T & {
  homeScore: number;
  awayScore: number;
};

export function annotateEventScores<
  T extends Pick<MatchEvent, "scoring_team_id" | "set_number" | "created_at">,
>(events: T[], homeTeamId: string): EventWithSetScore<T>[] {
  const chronological = [...events].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  let home = 0;
  let away = 0;
  let setNumber = chronological[0]?.set_number ?? 1;
  const annotated: EventWithSetScore<T>[] = [];

  for (const event of chronological) {
    if (event.set_number !== setNumber) {
      home = 0;
      away = 0;
      setNumber = event.set_number;
    }
    if (event.scoring_team_id === homeTeamId) home += 1;
    else if (event.scoring_team_id) away += 1;
    annotated.push({ ...event, homeScore: home, awayScore: away });
  }

  return annotated;
}

export type ComputeMatchStateOptions = {
  /** Close the current set and award it to the team that's ahead (amistoso finished early). */
  awardOpenSet?: boolean;
};

function closeOpenSet(state: {
  homeSets: number;
  awaySets: number;
  homePoints: number;
  awayPoints: number;
  setScores: SetScore[];
}) {
  if (state.homePoints === 0 && state.awayPoints === 0) return state;
  const setScores = [...state.setScores, { home: state.homePoints, away: state.awayPoints }];
  let homeSets = state.homeSets;
  let awaySets = state.awaySets;
  if (state.homePoints > state.awayPoints) homeSets += 1;
  else if (state.awayPoints > state.homePoints) awaySets += 1;
  return {
    homeSets,
    awaySets,
    homePoints: 0,
    awayPoints: 0,
    setScores,
  };
}

export function computeMatchState(
  events: Pick<MatchEvent, "scoring_team_id" | "created_at">[],
  homeTeamId: string,
  currentStatus: "scheduled" | "live" | "finished" | "cancelled",
  setsToWin = SETS_TO_WIN,
  options?: ComputeMatchStateOptions
): ComputedMatchState {
  const needed = setsToWin === 2 ? 2 : SETS_TO_WIN;
  const awardOpenSet = Boolean(options?.awardOpenSet) || currentStatus === "finished";
  const ordered = [...events]
    .filter((event) => event.scoring_team_id)
    .sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

  let homeSets = 0;
  let awaySets = 0;
  let currentSet = 1;
  let homePoints = 0;
  let awayPoints = 0;
  let setScores: SetScore[] = [];

  for (const event of ordered) {
    // Keep counting extra sets that were actually played (e.g. a 3rd set in a
    // best-of-3 after 2-0). While the match is still live, stop at the winner.
    if (!awardOpenSet && (homeSets >= needed || awaySets >= needed)) break;

    if (event.scoring_team_id === homeTeamId) homePoints += 1;
    else awayPoints += 1;

    if (isSetWon(homePoints, awayPoints, currentSet, needed)) {
      setScores.push({ home: homePoints, away: awayPoints });
      if (homePoints > awayPoints) homeSets += 1;
      else awaySets += 1;
      homePoints = 0;
      awayPoints = 0;
      currentSet += 1;
    }
  }

  if (awardOpenSet) {
    const closed = closeOpenSet({ homeSets, awaySets, homePoints, awayPoints, setScores });
    homeSets = closed.homeSets;
    awaySets = closed.awaySets;
    homePoints = closed.homePoints;
    awayPoints = closed.awayPoints;
    setScores = closed.setScores;
  }

  const reachedLimit = homeSets >= needed || awaySets >= needed;
  const finished = awardOpenSet || reachedLimit;

  return {
    homeSets,
    awaySets,
    currentSet: finished ? Math.max(1, setScores.length || currentSet) : currentSet,
    homePoints: finished ? 0 : homePoints,
    awayPoints: finished ? 0 : awayPoints,
    setScores,
    status: finished ? "finished" : currentStatus === "scheduled" ? "live" : "live",
  };
}

export function overlayFinishedMatchScore<
  T extends {
    status: string;
    home_team_id: string;
    home_sets: number;
    away_sets: number;
    home_points: number;
    away_points: number;
    current_set: number;
    set_scores: SetScore[];
    sets_to_win?: number | null;
    is_federation?: boolean | null;
  },
>(match: T, events: Pick<MatchEvent, "scoring_team_id" | "created_at">[]): T {
  if (match.status !== "finished") return match;
  let computed = computeMatchState(
    events,
    match.home_team_id,
    "finished",
    setsToWinOf(match)
  );

  const storedHome = match.home_points ?? 0;
  const storedAway = match.away_points ?? 0;
  const alreadyStored = computed.setScores.some(
    (set) => set.home === storedHome && set.away === storedAway
  );
  if (
    (storedHome > 0 || storedAway > 0) &&
    !alreadyStored &&
    computed.setScores.length < Math.max(match.current_set ?? 0, computed.setScores.length + 1)
  ) {
    const closed = closeOpenSet({
      homeSets: computed.homeSets,
      awaySets: computed.awaySets,
      homePoints: storedHome,
      awayPoints: storedAway,
      setScores: computed.setScores,
    });
    computed = {
      ...computed,
      ...closed,
      currentSet: Math.max(1, closed.setScores.length),
    };
  }

  if (computed.setScores.length === 0) return match;
  return {
    ...match,
    home_sets: computed.homeSets,
    away_sets: computed.awaySets,
    home_points: 0,
    away_points: 0,
    current_set: computed.currentSet,
    set_scores: computed.setScores,
  };
}

export function totalPlayerPoints(stats: {
  attack_points: number;
  block_points: number;
  aces: number;
  other_points: number;
}) {
  return (
    stats.attack_points + stats.block_points + stats.aces + stats.other_points
  );
}

export function statFromPointType(pointType: PointType) {
  switch (pointType) {
    case "attack":
      return "attack_points" as const;
    case "block":
      return "block_points" as const;
    case "ace":
      return "aces" as const;
    case "error":
    case "attack_error":
    case "serve_error":
    case "reception_error":
    case "defense_error":
    case "block_error":
      return "errors" as const;
    case "opponent_error":
      return "opponent_errors" as const;
    case "other":
      return "other_points" as const;
    case "blockout":
      return "block_points" as const;
    default:
      return null;
  }
}
