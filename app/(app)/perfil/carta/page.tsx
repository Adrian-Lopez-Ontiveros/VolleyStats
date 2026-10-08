import type { Metadata } from "next";
import { PlayerCardForm } from "@/components/players/player-card-form";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth";
import { PLAYER_CARD_SELECT } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import { readUserProgress } from "@/lib/user-progress";
import type { PlayerCard } from "@/lib/types";

export const metadata: Metadata = { title: "Editar cromo" };

export default async function OwnPlayerCardPage() {
  const user = await requireUser();
  const player = user.profile.player;

  if (!player) {
    return (
      <>
        <PageHeader
          title="Tu cromo"
          description="Tu perfil de jugador aún no está vinculado. Un admin puede asociarlo."
        />
      </>
    );
  }

  const supabase = await createClient();
  const [{ data: card }, progress] = await Promise.all([
    supabase
      .from("player_cards")
      .select(PLAYER_CARD_SELECT as "*")
      .eq("player_id", player.id)
      .maybeSingle(),
    readUserProgress((columns) =>
      supabase.from("user_progress").select(columns).eq("user_id", user.id).maybeSingle()
    ),
  ]);

  return (
    <>
      <PageHeader
        title="Tu cromo"
        description="Foto, posición y estadísticas estilo carta FIFA. El rating se calcula solo según tu posición."
      />
      <PlayerCardForm
        player={player}
        card={(card as PlayerCard | null) ?? null}
        team={user.profile.team}
        userId={user.id}
        cancelHref="/perfil"
        cardStyle={progress.data?.equipped_card}
      />
    </>
  );
}
