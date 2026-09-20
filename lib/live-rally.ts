import { isScoringAction } from "@/lib/volleyball";
import type { PointType } from "@/lib/types";

type RallyEvent = {
  point_type: PointType;
  acting_team_id: string;
  set_number: number;
  created_at: string;
};

const SERVE_TYPES: PointType[] = ["ace", "serve_in", "serve_error"];
const RECEPTION_TYPES: PointType[] = [
  "reception_good",
  "reception_medium",
  "reception_bad",
  "reception_error",
];

export function isServeType(type: PointType) {
  return SERVE_TYPES.includes(type);
}

export function isReceptionType(type: PointType) {
  return RECEPTION_TYPES.includes(type);
}

export function eventsInCurrentRally<T extends RallyEvent>(events: T[], currentSet: number): T[] {
  const inSet = events
    .filter((event) => event.set_number === currentSet)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  let start = 0;
  for (let index = 0; index < inSet.length; index += 1) {
    if (isScoringAction(inSet[index].point_type)) start = index + 1;
  }
  return inSet.slice(start);
}

export function rallyLocks(
  events: RallyEvent[],
  currentSet: number,
  teamId: string,
  serving: boolean
) {
  const rally = eventsInCurrentRally(events, currentSet);
  const serveUsed = rally.some((event) => isServeType(event.point_type));
  const receptionUsed = rally.some(
    (event) => isReceptionType(event.point_type) && event.acting_team_id === teamId
  );
  return {
    serveLocked: !serving || serveUsed,
    receptionLocked: serving || receptionUsed,
  };
}
