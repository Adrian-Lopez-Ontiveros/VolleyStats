import { TeamsBrowser } from "@/components/teams/teams-browser";
import { requireViewer } from "@/lib/auth";
import { parseCategory } from "@/lib/categories";
import { getClubTeams, getPlayers } from "@/lib/data";
import type { Player, Team } from "@/lib/types";

export default async function TeamsPage({
  searchParams,
}: {
  searchParams: Promise<{ categoria?: string }>;
}) {
  const { categoria: rawCategory } = await searchParams;
  const { isAdmin } = await requireViewer();
  const categoria = parseCategory(rawCategory);

  const [{ data: teams, error: teamsError }, { data: players, error: playersError }] =
    await Promise.all([getClubTeams(), getPlayers()]);

  const clubTeams = (teams ?? []) as Team[];
  const clubIds = new Set(clubTeams.map((team) => team.id));
  const clubPlayers = ((players ?? []) as Player[]).filter(
    (player) => player.team_id && clubIds.has(player.team_id)
  );

  return (
    <TeamsBrowser
      teams={clubTeams}
      players={clubPlayers}
      isAdmin={isAdmin}
      initialCategory={categoria}
      loadError={teamsError?.message ?? playersError?.message}
    />
  );
}
