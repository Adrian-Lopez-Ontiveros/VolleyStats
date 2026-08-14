import type { MatchLineupEntry, MatchSubstitution, Player } from "@/lib/types";

export function startingOnCourtIds(
  lineup: Pick<MatchLineupEntry, "player_id" | "is_starter" | "is_libero">[]
) {
  const ids = new Set<string>();
  for (const entry of lineup) {
    if (entry.is_starter || entry.is_libero) ids.add(entry.player_id);
  }
  return ids;
}

export function currentOnCourtIds(
  lineup: Pick<MatchLineupEntry, "player_id" | "is_starter" | "is_libero" | "team_id">[],
  substitutions: Pick<MatchSubstitution, "player_out_id" | "player_in_id" | "team_id">[],
  teamId?: string
) {
  const teamLineup = teamId ? lineup.filter((entry) => entry.team_id === teamId) : lineup;
  if (teamLineup.length === 0) return null;

  const onCourt = startingOnCourtIds(teamLineup);
  const teamSubs = teamId
    ? substitutions.filter((item) => item.team_id === teamId)
    : substitutions;

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

export function teamHasLineup(
  lineup: Pick<MatchLineupEntry, "team_id">[],
  teamId: string
) {
  return lineup.some((entry) => entry.team_id === teamId);
}
