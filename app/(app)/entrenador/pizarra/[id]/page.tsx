import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BoardPreview } from "@/components/coach/board-preview";
import { TacticalBoard } from "@/components/coach/tactical-board";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { requireMember } from "@/lib/auth";
import { PLAYER_LINEUP_SELECT, TACTICAL_PLAY_SELECT, TEAM_SELECT, hasCoachAccess } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import type { Player, TacticalPlay, Team, Training } from "@/lib/types";

export const metadata: Metadata = { title: "Jugada" };

export default async function BoardPlayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireMember();
  const canEdit = hasCoachAccess(session.profile.role);
  const supabase = await createClient();
  const [{ data: play }, { data: plays }, { data: teams }, { data: players }, { data: trainings }] =
    await Promise.all([
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
      supabase
        .from("trainings")
        .select("id, name, scheduled_at, team_id")
        .order("scheduled_at", { ascending: false })
        .limit(40),
    ]);

  if (!play) notFound();
  const typed = play as TacticalPlay;

  if (!canEdit) {
    return (
      <>
        <PageHeader title={typed.name} description={typed.notes?.trim() || "Pizarra del equipo"} />
        <Card>
          <CardContent className="p-4">
            <BoardPreview board={typed.board} uid={typed.id} />
          </CardContent>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Pizarra táctica"
        description="Edita la disposición y vuelve a guardarla cuando quieras."
      />
      <TacticalBoard
        key={typed.id}
        play={typed}
        plays={(plays ?? []) as TacticalPlay[]}
        teams={(teams ?? []) as Team[]}
        players={(players ?? []) as Player[]}
        trainings={(trainings ?? []) as Pick<Training, "id" | "name" | "scheduled_at" | "team_id">[]}
      />
    </>
  );
}
