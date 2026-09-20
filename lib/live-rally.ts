import { isScoringAction } from "@/lib/volleyball";
import type { PointType } from "@/lib/types";

export type RallyPhase = "serve" | "receive" | "block_def" | "attack";

export type RallyPadState = {
  phase: RallyPhase;
  serveLocked: boolean;
};

type RallyEvent = {
  point_type: PointType;
  acting_team_id: string;
  set_number: number;
  created_at: string;
  scoring_team_id?: string | null;
};

const SERVE_TYPES: PointType[] = ["ace", "serve_in", "serve_error"];
const RECEPTION_KEEP: PointType[] = ["reception_good", "reception_medium", "reception_bad"];
const DEFENSE_KEEP: PointType[] = ["defense_good", "defense_medium", "defense_bad"];
const BLOCK_KEEP: PointType[] = ["block_touch", "block_continuation"];

export const RALLY_PHASE_LABEL: Record<RallyPhase, string> = {
  serve: "Saque",
  receive: "Recepción",
  block_def: "Bloqueo",
  attack: "Ataque",
};

function isServeType(type: PointType) {
  return SERVE_TYPES.includes(type);
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

export function rallyPadState(
  events: RallyEvent[],
  currentSet: number,
  teamId: string,
  serving: boolean
): RallyPadState {
  const rally = eventsInCurrentRally(events, currentSet);
  let phase: RallyPhase = serving ? "serve" : "receive";
  let serveLocked = false;

  for (const event of rally) {
    if (isServeType(event.point_type)) {
      serveLocked = true;
      if (event.point_type === "serve_in") {
        phase = serving ? "block_def" : "receive";
      }
      continue;
    }
    if (RECEPTION_KEEP.includes(event.point_type)) {
      phase = event.acting_team_id === teamId ? "attack" : "block_def";
      continue;
    }
    if (DEFENSE_KEEP.includes(event.point_type)) {
      phase = event.acting_team_id === teamId ? "attack" : "block_def";
      continue;
    }
    if (event.point_type === "attack_continuation") {
      phase = "block_def";
      continue;
    }
    if (BLOCK_KEEP.includes(event.point_type)) {
      phase = "block_def";
    }
  }

  return { phase, serveLocked };
}
