import { designatedLiberos } from "@/lib/court";
import type { MatchLineupEntry, MatchSubstitution, Player } from "@/lib/types";

export function startingOnCourtIds(
  lineup: Pick<
    MatchLineupEntry,
    "player_id" | "is_starter" | "is_libero" | "is_reception_libero" | "is_defense_libero" | "is_active_libero" | "team_id"
  >[]
) {
  const ids = new Set<string>();
  for (const entry of lineup) {
    if (entry.is_starter) ids.add(entry.player_id);
  }
  const { activeId } = designatedLiberos(lineup);
  if (activeId) ids.add(activeId);
  return ids;
}

export function substitutionsForSet<T extends { set_number?: number | null; team_id?: string }>(
  substitutions: T[],
  setNumber?: number,
  teamId?: string
) {
  return substitutions.filter((item) => {
    if (teamId && item.team_id && item.team_id !== teamId) return false;
    if (typeof setNumber !== "number") return true;
    return (item.set_number ?? 1) === setNumber;
  });
}

export function currentOnCourtIds(
  lineup: Pick<
    MatchLineupEntry,
    "player_id" | "is_starter" | "is_libero" | "is_reception_libero" | "is_defense_libero" | "is_active_libero" | "team_id"
  >[],
  substitutions: Pick<MatchSubstitution, "player_out_id" | "player_in_id" | "team_id" | "set_number">[],
  teamId?: string,
  setNumber?: number
) {
  const teamLineup = teamId ? lineup.filter((entry) => entry.team_id === teamId) : lineup;
  if (teamLineup.length === 0) return null;

  const onCourt = startingOnCourtIds(teamLineup);
  const teamSubs = substitutionsForSet(substitutions, setNumber, teamId);

  for (const item of teamSubs) {
    onCourt.delete(item.player_out_id);
    onCourt.add(item.player_in_id);
  }

  return onCourt;
}

export function playersOnCourt(roster: Player[], onCourtIds: Set<string> | null) {
  if (!onCourtIds) return roster;
  return roster.filter((player) => onCourtIds.has(player.id));
}

export function playersOnBench(roster: Player[], onCourtIds: Set<string> | null) {
  if (!onCourtIds) return [];
  return roster.filter((player) => !onCourtIds.has(player.id));
}
