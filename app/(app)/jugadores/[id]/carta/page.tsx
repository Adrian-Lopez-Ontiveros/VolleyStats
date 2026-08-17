import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PlayerCardForm } from "@/components/players/player-card-form";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth";
import { PLAYER_CARD_SELECT, PLAYER_ROSTER_SELECT, TEAM_SUMMARY_SELECT } from "@/lib/constants";
import { canManagePlayerCard } from "@/lib/player-card";
import { createClient } from "@/lib/supabase/server";
import type { PlayerCard, PlayerWithTeam } from "@/lib/types";

export const metadata: Metadata = { title: "Editar cromo" };

export default async function PlayerCardEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireUser();
  if (!canManagePlayerCard(session, id)) redirect(`/jugadores/${id}`);

  const supabase = await createClient();
  const [{ data: player }, { data: card }] = await Promise.all([
    supabase
      .from("players")
      .select(`${PLAYER_ROSTER_SELECT}, team:teams(${TEAM_SUMMARY_SELECT})` as "*")
      .eq("id", id)
      .maybeSingle(),
    supabase.from("player_cards").select(PLAYER_CARD_SELECT as "*").eq("player_id", id).maybeSingle(),
  ]);

  if (!player) notFound();
  const typed = player as PlayerWithTeam;

  return (
    <>
      <PageHeader
        title={`Cromo de ${typed.full_name}`}
        description="Foto, posición y estadísticas estilo carta FIFA."
      />
      <PlayerCardForm
        player={typed}
        card={(card as PlayerCard | null) ?? null}
        team={typed.team}
        userId={typed.user_id ?? session.id}
        cancelHref={`/jugadores/${id}`}
      />
    </>
  );
}
