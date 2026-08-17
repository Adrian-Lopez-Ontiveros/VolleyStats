import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TacticalBoard } from "@/components/coach/tactical-board";
import { PageHeader } from "@/components/page-header";
import { requireCoach } from "@/lib/auth";
import { PLAYER_LINEUP_SELECT, TACTICAL_PLAY_SELECT, TEAM_SELECT } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import type { Player, TacticalPlay, Team } from "@/lib/types";

export const metadata: Metadata = { title: "Jugada" };

export default async function BoardPlayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireCoach();
  const supabase = await createClient();
  const [{ data: play }, { data: plays }, { data: teams }, { data: players }] = await Promise.all([
    supabase.from("tactical_plays").select(TACTICAL_PLAY_SELECT as "*").eq("id", id).maybeSingle(),
    supabase
      .from("tactical_plays")
      .select(TACTICAL_PLAY_SELECT as "*")
      .order("updated_at", { ascending: false }),
    supabase.from("teams").select(TEAM_SELECT as "*").order("name"),
    supabase
      .from("players")
      .select(PLAYER_LINEUP_SELECT as "*")
      .order("jersey_number", { ascending: true, nullsFirst: false }),
  ]);

  if (!play) notFound();

  return (
    <>
      <PageHeader
        title="Pizarra táctica"
        description="Edita la disposición y vuelve a guardarla cuando quieras."
      />
      <TacticalBoard
        key={(play as TacticalPlay).id}
        play={play as TacticalPlay}
        plays={(plays ?? []) as TacticalPlay[]}
        teams={(teams ?? []) as Team[]}
        players={(players ?? []) as Player[]}
      />
    </>
  );
}
