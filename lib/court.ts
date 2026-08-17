import type { MatchLineupEntry, MatchSubstitution, Player } from "@/lib/types";
import { isRotation } from "@/lib/volleyball-stats";

export const COURT_POSITIONS = [1, 2, 3, 4, 5, 6] as const;
export type CourtPosition = (typeof COURT_POSITIONS)[number];

export const COURT_LAYOUT: CourtPosition[][] = [
  [4, 3, 2],
  [5, 6, 1],
];

export const COURT_POSITION_META: Record<
  CourtPosition,
  { label: string; short: string; zone: "front" | "back" }
> = {
  1: { label: "Saque", short: "Saque", zone: "back" },
  2: { label: "Derecha", short: "Dcha.", zone: "front" },
  3: { label: "Central", short: "Central", zone: "front" },
  4: { label: "Izquierda", short: "Izq.", zone: "front" },
  5: { label: "Zaguera izq.", short: "Zag. I", zone: "back" },
  6: { label: "Zaguera cen.", short: "Zag. C", zone: "back" },
};

const CLOCKWISE: CourtPosition[] = [1, 6, 5, 4, 3, 2];

export type CourtOccupant = Pick<Player, "id" | "full_name" | "jersey_number" | "position" | "avatar_url">;

export type CourtSlots = Partial<Record<CourtPosition, CourtOccupant | null>>;

export function isCourtPosition(value: number | null | undefined): value is CourtPosition {
  return typeof value === "number" && value >= 1 && value <= 6;
}

export function rotatePosition(start: CourtPosition, steps: number): CourtPosition {
  const index = CLOCKWISE.indexOf(start);
  const offset = ((steps % 6) + 6) % 6;
  return CLOCKWISE[(index + offset) % 6];
}

export function rotationOffset(rotation: number | null | undefined) {
  return isRotation(rotation) ? rotation - 1 : 0;
}

export function lineupHasCourtPositions(
  lineup: Pick<MatchLineupEntry, "team_id" | "court_position">[],
  teamId?: string
) {
  return lineup.some(
    (entry) =>
      isCourtPosition(entry.court_position) && (!teamId || entry.team_id === teamId)
  );
}

function teamEntries<T extends { team_id: string }>(items: T[], teamId?: string) {
  return teamId ? items.filter((item) => item.team_id === teamId) : items;
}

export function startingCourtByPosition(
  lineup: Pick<MatchLineupEntry, "player_id" | "is_starter" | "is_libero" | "court_position" | "team_id">[],
  teamId?: string
) {
  const byStart = new Map<CourtPosition, string>();
  for (const entry of teamEntries(lineup, teamId)) {
    if (!entry.is_starter || entry.is_libero || !isCourtPosition(entry.court_position)) continue;
    byStart.set(entry.court_position, entry.player_id);
  }
  return byStart;
}

export function applySlotSubstitutions(
  slots: Map<CourtPosition, string>,
  substitutions: Pick<MatchSubstitution, "player_out_id" | "player_in_id" | "team_id">[],
  teamId?: string
) {
  const next = new Map(slots);
  for (const sub of teamEntries(substitutions, teamId)) {
    for (const [position, playerId] of next) {
      if (playerId === sub.player_out_id) {
        next.set(position, sub.player_in_id);
        break;
      }
    }
  }
  return next;
}

export function currentCourtSlots(
  lineup: Pick<MatchLineupEntry, "player_id" | "is_starter" | "is_libero" | "court_position" | "team_id">[],
  substitutions: Pick<MatchSubstitution, "player_out_id" | "player_in_id" | "team_id">[],
  roster: CourtOccupant[],
  rotation: number | null | undefined,
  teamId?: string
): CourtSlots {
  const occupied = applySlotSubstitutions(startingCourtByPosition(lineup, teamId), substitutions, teamId);
  const steps = rotationOffset(rotation);
  const byId = new Map(roster.map((player) => [player.id, player]));
  const slots: CourtSlots = {};

  for (const [startPosition, playerId] of occupied) {
    const player = byId.get(playerId);
    if (!player) continue;
    slots[rotatePosition(startPosition, steps)] = player;
  }

  return slots;
}

export function currentLiberoPlayer(
  lineup: Pick<MatchLineupEntry, "player_id" | "is_libero" | "team_id">[],
  substitutions: Pick<MatchSubstitution, "player_out_id" | "player_in_id" | "team_id">[],
  roster: CourtOccupant[],
  teamId?: string
): CourtOccupant | null {
  const entry = teamEntries(lineup, teamId).find((item) => item.is_libero);
  if (!entry) return null;

  let playerId = entry.player_id;
  for (const sub of teamEntries(substitutions, teamId)) {
    if (sub.player_out_id === playerId) playerId = sub.player_in_id;
  }

  return roster.find((player) => player.id === playerId) ?? null;
}

export function liberoOffCourt(libero: CourtOccupant | null, slots: CourtSlots) {
  if (!libero) return null;
  const onCourt = COURT_POSITIONS.some((position) => slots[position]?.id === libero.id);
  return onCourt ? null : libero;
}

export function firstName(fullName: string) {
  return fullName.split(" ").filter(Boolean)[0] ?? fullName;
}
