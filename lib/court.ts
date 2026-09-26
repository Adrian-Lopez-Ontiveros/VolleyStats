import type { LiberoKind, MatchLineupEntry, MatchSubstitution, Player } from "@/lib/types";
import { isRotation, stepsBetweenZones } from "@/lib/volleyball-stats";

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

export function rotationOffset(rotation: number | null | undefined, setterStart?: number | null) {
  if (!isRotation(rotation)) return 0;
  return stepsBetweenZones(isRotation(setterStart) ? setterStart : 1, rotation);
}

export function setterStartZone(
  lineup: Pick<
    MatchLineupEntry,
    | "team_id"
    | "player_id"
    | "is_starter"
    | "is_libero"
    | "is_reception_libero"
    | "is_defense_libero"
    | "court_position"
  >[],
  roster: Pick<Player, "id" | "position">[],
  teamId?: string
): CourtPosition | null {
  const setters = new Set(
    roster.filter((player) => player.position === "colocador").map((player) => player.id)
  );
  if (setters.size === 0) return null;
  for (const entry of lineup) {
    if (teamId && entry.team_id !== teamId) continue;
    if (!entry.is_starter || isDesignatedLibero(entry)) continue;
    if (!setters.has(entry.player_id) || !isCourtPosition(entry.court_position)) continue;
    return entry.court_position;
  }
  return null;
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

export type LineupLiberoFlags = Pick<
  MatchLineupEntry,
  "is_libero" | "is_reception_libero" | "is_defense_libero" | "is_active_libero"
>;

export function isReceptionLibero(entry: LineupLiberoFlags) {
  if (entry.is_reception_libero) return true;
  if (entry.is_defense_libero) return false;
  return Boolean(entry.is_libero);
}

export function isDefenseLibero(entry: LineupLiberoFlags) {
  if (entry.is_defense_libero) return true;
  if (entry.is_reception_libero) return false;
  return Boolean(entry.is_libero);
}

export function isDesignatedLibero(entry: LineupLiberoFlags) {
  return isReceptionLibero(entry) || isDefenseLibero(entry);
}

export function designatedLiberos<T extends { player_id: string; team_id: string } & LineupLiberoFlags>(
  lineup: T[],
  teamId?: string
) {
  const team = teamEntries(lineup, teamId);
  const reception = team.find(isReceptionLibero) ?? null;
  const defense = team.find(isDefenseLibero) ?? null;
  const activeEntry =
    team.find((entry) => entry.is_active_libero) ?? reception ?? defense ?? team.find((entry) => entry.is_libero) ?? null;
  const activeId = activeEntry?.player_id ?? null;
  const activeKind: LiberoKind | null = !activeId
    ? null
    : reception?.player_id === activeId
      ? "reception"
      : defense?.player_id === activeId
        ? "defense"
        : "reception";

  return {
    receptionId: reception?.player_id ?? null,
    defenseId: defense?.player_id ?? null,
    activeId,
    activeKind,
  };
}

export const LIBERO_KIND_LABEL: Record<LiberoKind, string> = {
  reception: "Recepción",
  defense: "Defensa",
};

export function liberoKindForPhase(
  serving: boolean,
  receptionId: string | null,
  defenseId: string | null
): LiberoKind | null {
  if (!receptionId && !defenseId) return null;
  if (serving) return defenseId ? "defense" : "reception";
  return receptionId ? "reception" : "defense";
}

export function phaseLiberoId(
  serving: boolean,
  receptionId: string | null,
  defenseId: string | null
) {
  const kind = liberoKindForPhase(serving, receptionId, defenseId);
  if (kind === "defense") return defenseId;
  if (kind === "reception") return receptionId;
  return null;
}

export function applyPhaseLibero(
  onCourt: Set<string> | null,
  slots: CourtSlots,
  receptionId: string | null,
  defenseId: string | null,
  serving: boolean
) {
  if (!onCourt) return onCourt;
  const next = new Set(onCourt);
  const inSlot = new Set(
    Object.values(slots)
      .filter((player): player is CourtOccupant => Boolean(player))
      .map((player) => player.id)
  );
  const phaseId = phaseLiberoId(serving, receptionId, defenseId);
  const otherId = phaseId === receptionId ? defenseId : receptionId;
  if (otherId && otherId !== phaseId && !inSlot.has(otherId)) next.delete(otherId);
  if (phaseId) {
    next.add(phaseId);
    const offCourt: CourtPosition[] = serving ? [5, 6] : [1, 5, 6];
    for (const position of offCourt) {
      const player = slots[position];
      if (player?.position === "central") next.delete(player.id);
    }
  }
  return next;
}

export function startingCourtByPosition(
  lineup: Pick<
    MatchLineupEntry,
    | "player_id"
    | "is_starter"
    | "is_libero"
    | "is_reception_libero"
    | "is_defense_libero"
    | "court_position"
    | "team_id"
  >[],
  teamId?: string
) {
  const byStart = new Map<CourtPosition, string>();
  for (const entry of teamEntries(lineup, teamId)) {
    if (!entry.is_starter || isDesignatedLibero(entry) || !isCourtPosition(entry.court_position)) continue;
    byStart.set(entry.court_position, entry.player_id);
  }
  return byStart;
}

function substitutionsForSet<T extends { team_id: string; set_number?: number | null }>(
  substitutions: T[],
  teamId?: string,
  setNumber?: number
) {
  return teamEntries(substitutions, teamId).filter((item) => {
    if (typeof setNumber !== "number") return true;
    return (item.set_number ?? 1) === setNumber;
  });
}

export function applySlotSubstitutions(
  slots: Map<CourtPosition, string>,
  substitutions: Pick<MatchSubstitution, "player_out_id" | "player_in_id" | "team_id" | "set_number">[],
  teamId?: string,
  setNumber?: number
) {
  const next = new Map(slots);
  for (const sub of substitutionsForSet(substitutions, teamId, setNumber)) {
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
  lineup: Pick<
    MatchLineupEntry,
    | "player_id"
    | "is_starter"
    | "is_libero"
    | "is_reception_libero"
    | "is_defense_libero"
    | "court_position"
    | "team_id"
  >[],
  substitutions: Pick<MatchSubstitution, "player_out_id" | "player_in_id" | "team_id" | "set_number">[],
  roster: CourtOccupant[],
  rotation: number | null | undefined,
  teamId?: string,
  setNumber?: number,
  setterStart?: number | null
): CourtSlots {
  const occupied = applySlotSubstitutions(
    startingCourtByPosition(lineup, teamId),
    substitutions,
    teamId,
    setNumber
  );
  const steps = rotationOffset(rotation, setterStart);
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
  lineup: Pick<MatchLineupEntry, "player_id" | "is_libero" | "is_reception_libero" | "is_defense_libero" | "is_active_libero" | "team_id">[],
  substitutions: Pick<MatchSubstitution, "player_out_id" | "player_in_id" | "team_id" | "set_number">[],
  roster: CourtOccupant[],
  teamId?: string,
  setNumber?: number
): CourtOccupant | null {
  const { activeId } = designatedLiberos(lineup, teamId);
  if (!activeId) return null;

  let playerId = activeId;
  for (const sub of substitutionsForSet(substitutions, teamId, setNumber)) {
    if (sub.player_out_id === playerId) playerId = sub.player_in_id;
  }

  return roster.find((player) => player.id === playerId) ?? null;
}

export function currentLiberoPlayers(
  lineup: Pick<MatchLineupEntry, "player_id" | "is_libero" | "is_reception_libero" | "is_defense_libero" | "is_active_libero" | "team_id">[],
  substitutions: Pick<MatchSubstitution, "player_out_id" | "player_in_id" | "team_id" | "set_number">[],
  roster: CourtOccupant[],
  teamId?: string,
  setNumber?: number
) {
  const { receptionId, defenseId, activeKind } = designatedLiberos(lineup, teamId);
  const byId = new Map(roster.map((player) => [player.id, player]));

  function follow(playerId: string | null) {
    if (!playerId) return null;
    let current = playerId;
    for (const sub of substitutionsForSet(substitutions, teamId, setNumber)) {
      if (sub.player_out_id === current) current = sub.player_in_id;
    }
    return byId.get(current) ?? byId.get(playerId) ?? null;
  }

  return {
    reception: follow(receptionId),
    defense: follow(defenseId),
    activeKind,
  };
}

export function liberoOffCourt(libero: CourtOccupant | null, slots: CourtSlots) {
  if (!libero) return null;
  const onCourt = COURT_POSITIONS.some((position) => slots[position]?.id === libero.id);
  return onCourt ? null : libero;
}

export function firstName(fullName: string) {
  return fullName.split(" ").filter(Boolean)[0] ?? fullName;
}
