import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { PlayerCompare } from "@/components/stats/player-compare";
import { requireAdmin } from "@/lib/auth";
import { getClubTeams, getPlayers } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import type { Player, PointType, Team } from "@/lib/types";

export const metadata: Metadata = { title: "Comparar jugadores" };

export default async function ComparePlayersPage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string; team?: string }>;
}) {
  const { ids, team } = await searchParams;
  await requireAdmin();
  const supabase = await createClient();

  const [{ data: teams }, { data: players }] = await Promise.all([
    getClubTeams(),
    getPlayers(),
  ]);

  const clubTeams = (teams ?? []) as Team[];
  const allPlayers = ((players ?? []) as Player[]).sort((a, b) =>
    a.full_name.localeCompare(b.full_name, "es")
  );
  const initialIds = (ids ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
    .slice(0, 3);

  const seedPlayer = initialIds.length
    ? allPlayers.find((player) => player.id === initialIds[0])
    : null;
  const teamId = team || seedPlayer?.team_id || null;
  const teamPlayers = teamId
    ? allPlayers.filter((player) => player.team_id === teamId)
    : [];
  const teamName = new Map(clubTeams.map((item) => [item.id, item.name]));
  const selectedTeamName = teamId ? teamName.get(teamId) : null;

  const playerIds = teamPlayers.map((player) => player.id);
  const { data: events } =
    playerIds.length > 0
      ? await supabase
          .from("match_events")
          .select("player_id, point_type, set_number, serving_team_id")
          .in("player_id", playerIds)
      : { data: [] };

  return (
    <>
      <PageHeader
        title="Comparar jugadores"
        description={
          selectedTeamName
            ? `Compañeros de ${selectedTeamName}. Elige 2 o 3 para comparar puntos, ataque, saque y recepción.`
            : "Entra desde un equipo o una ficha de jugador para comparar a sus compañeros."
        }
      />
      <PlayerCompare
        initialIds={initialIds.filter((id) => teamPlayers.some((player) => player.id === id))}
        players={teamPlayers.map((player) => ({
          id: player.id,
          full_name: player.full_name,
          jersey_number: player.jersey_number,
          avatar_url: player.avatar_url,
          team_id: player.team_id,
          teamName: (player.team_id && teamName.get(player.team_id)) || "Club",
        }))}
        events={((events ?? []) as {
          player_id: string;
          point_type: PointType;
          set_number?: number | null;
          serving_team_id?: string | null;
        }[])}
      />
    </>
  );
}
