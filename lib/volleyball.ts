import {
  DECIDING_SET_POINTS,
  MIN_LEAD,
  REGULAR_SET_POINTS,
  SETS_TO_WIN,
} from "@/lib/constants";
import type { MatchEvent, PointType, SetScore } from "@/lib/types";

export function scoresForActingTeam(pointType: PointType) {
  return pointType !== "error";
}

export function resolveScoringTeam(
  actingTeamId: string,
  homeTeamId: string,
  awayTeamId: string,
  pointType: PointType
) {
  const opponentId = actingTeamId === homeTeamId ? awayTeamId : homeTeamId;
  return scoresForActingTeam(pointType) ? actingTeamId : opponentId;
}

export function targetPointsForSet(setNumber: number) {
  return setNumber >= 5 ? DECIDING_SET_POINTS : REGULAR_SET_POINTS;
}

export function isSetWon(home: number, away: number, setNumber: number) {
  const target = targetPointsForSet(setNumber);
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
    else away += 1;
    annotated.push({ ...event, homeScore: home, awayScore: away });
  }

  return annotated;
}

export function groupEventsBySet<T extends { set_number: number }>(
  events: T[]
): { setNumber: number; events: T[] }[] {
  const groups = new Map<number, T[]>();
  for (const event of events) {
    const list = groups.get(event.set_number);
    if (list) list.push(event);
    else groups.set(event.set_number, [event]);
  }

  return [...groups.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([setNumber, setEvents]) => ({ setNumber, events: setEvents }));
}

export function computeMatchState(
  events: Pick<MatchEvent, "scoring_team_id" | "created_at">[],
  homeTeamId: string,
  currentStatus: "scheduled" | "live" | "finished" | "cancelled"
): ComputedMatchState {
  const ordered = [...events].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  let homeSets = 0;
  let awaySets = 0;
  let currentSet = 1;
  let homePoints = 0;
  let awayPoints = 0;
  const setScores: SetScore[] = [];

  for (const event of ordered) {
    if (homeSets >= SETS_TO_WIN || awaySets >= SETS_TO_WIN) break;

    if (event.scoring_team_id === homeTeamId) homePoints += 1;
    else awayPoints += 1;

    if (isSetWon(homePoints, awayPoints, currentSet)) {
      setScores.push({ home: homePoints, away: awayPoints });
      if (homePoints > awayPoints) homeSets += 1;
      else awaySets += 1;
      homePoints = 0;
      awayPoints = 0;
      currentSet += 1;
    }
  }

  const finished = homeSets >= SETS_TO_WIN || awaySets >= SETS_TO_WIN;

  return {
    homeSets,
    awaySets,
    currentSet: finished ? Math.max(1, currentSet - 1) : currentSet,
    homePoints: finished ? 0 : homePoints,
    awayPoints: finished ? 0 : awayPoints,
    setScores,
    status: finished ? "finished" : currentStatus === "scheduled" ? "live" : "live",
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
      return "errors" as const;
    case "opponent_error":
      return "opponent_errors" as const;
    default:
      return "other_points" as const;
  }
}
