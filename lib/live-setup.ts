import type { MatchLineupEntry } from "@/lib/types";

export function needsInitialLineupSetup(
  match: { home_team_id: string; away_team_id: string; current_set: number },
  lineup: MatchLineupEntry[],
  homePlayerCount: number,
  awayPlayerCount: number,
  finished: boolean,
  setHasEvents: boolean
): boolean {
  if (finished || match.current_set !== 1 || setHasEvents) return false;
  const starters = (teamId: string) => lineup.some((entry) =>
    entry.team_id === teamId && !entry.is_libero &&
    entry.is_starter && entry.court_position != null &&
    entry.court_position >= 1 && entry.court_position <= 6
  );
  return (homePlayerCount > 0 && !starters(match.home_team_id)) ||
    (awayPlayerCount > 0 && !starters(match.away_team_id));
}
