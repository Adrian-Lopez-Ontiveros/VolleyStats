import { TeamsBrowser } from "@/components/teams/teams-browser";
import { requireViewer, resolveViewerTeamCategory } from "@/lib/auth";
import { isTeamCategory, parseCategory } from "@/lib/categories";
import { getClubTeams, getPlayers, getPublicPlayers } from "@/lib/data";
import { rewardFramesByPlayer } from "@/lib/reward-frames";
import { createClient } from "@/lib/supabase/server";
import type { Player, Team } from "@/lib/types";

export default async function TeamsPage({
  searchParams,
}: {
  searchParams: Promise<{ categoria?: string }>;
}) {
  const [{ categoria: rawCategory }, viewer] = await Promise.all([searchParams, requireViewer()]);
  const { canManage, user } = viewer;
  const [{ data: teams, error: teamsError }, { data: players, error: playersError }, teamCategory] =
    await Promise.all([
      getClubTeams(),
      canManage ? getPlayers() : getPublicPlayers(),
      isTeamCategory(rawCategory) ? Promise.resolve(null) : resolveViewerTeamCategory(user),
    ]);
  const categoria = isTeamCategory(rawCategory) ? rawCategory : (teamCategory ?? parseCategory(rawCategory));

  const clubTeams = (teams ?? []) as Team[];
  const clubIds = new Set(clubTeams.map((team) => team.id));
  const clubPlayers = ((players ?? []) as Player[]).filter(
    (player) => player.team_id && clubIds.has(player.team_id)
  );

  const supabase = await createClient();
  const frames = await rewardFramesByPlayer(
    (ids) => supabase.from("players").select("id, user_id").in("id", ids),
    (userIds) => supabase.from("user_progress").select("user_id, equipped_frame").in("user_id", userIds),
    clubPlayers.map((player) => player.id)
  );

  return (
    <TeamsBrowser
      teams={clubTeams}
      players={clubPlayers}
      canManage={canManage}
      currentPlayerId={user?.profile.player?.id ?? null}
      initialCategory={categoria}
      frames={frames}
      loadError={teamsError?.message ?? playersError?.message}
    />
  );
}
