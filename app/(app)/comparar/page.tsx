import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { PlayerCompare } from "@/components/stats/player-compare";
import { requireViewer } from "@/lib/auth";
import { getClubTeams, getPlayers } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import type { Player, PointType, Team } from "@/lib/types";

export const metadata: Metadata = { title: "Comparar jugadores" };

export default async function ComparePlayersPage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string }>;
}) {
  const { ids } = await searchParams;
  await requireViewer();
  const supabase = await createClient();

  const [{ data: teams }, { data: players }] = await Promise.all([
    getClubTeams(),
    getPlayers(),
  ]);

  const clubTeams = (teams ?? []) as Team[];
  const clubIds = new Set(clubTeams.map((team) => team.id));
  const clubPlayers = ((players ?? []) as Player[])
    .filter((player) => player.team_id && clubIds.has(player.team_id))
    .sort((a, b) => a.full_name.localeCompare(b.full_name, "es"));
  const teamName = new Map(clubTeams.map((team) => [team.id, team.name]));

  const playerIds = clubPlayers.map((player) => player.id);
  const { data: events } =
    playerIds.length > 0
      ? await supabase
          .from("match_events")
          .select("player_id, point_type, set_number, serving_team_id")
          .in("player_id", playerIds)
      : { data: [] };

  const initialIds = (ids ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
    .slice(0, 3);

  return (
    <>
      <PageHeader
        title="Comparar jugadores"
        description="Elige 2 o 3 jugadores de las plantillas del club y mira puntos, ataque, saque y recepción."
      />
      <PlayerCompare
        initialIds={initialIds}
        players={clubPlayers.map((player) => ({
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
