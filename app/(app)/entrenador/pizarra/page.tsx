import type { Metadata } from "next";
import { TacticalBoard } from "@/components/coach/tactical-board";
import { PageHeader } from "@/components/page-header";
import { requireCoach } from "@/lib/auth";
import { PLAYER_LINEUP_SELECT, TACTICAL_PLAY_SELECT, TEAM_SELECT } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import type { Player, TacticalPlay, Team, Training } from "@/lib/types";

export const metadata: Metadata = { title: "Pizarra táctica" };

export default async function BoardPage({
  searchParams,
}: {
  searchParams: Promise<{ entrenamiento?: string }>;
}) {
  const { entrenamiento } = await searchParams;
  await requireCoach();
  const supabase = await createClient();
  const [{ data: plays }, { data: teams }, { data: players }, { data: trainings }] =
    await Promise.all([
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

  const typedTrainings = (trainings ?? []) as Pick<Training, "id" | "name" | "scheduled_at" | "team_id">[];
  const linked = typedTrainings.find((item) => item.id === entrenamiento);

  return (
    <>
      <PageHeader
        title="Pizarra táctica"
        description="Coloca jugadores, balones y material para explicar el ejercicio."
      />
      <TacticalBoard
        key={entrenamiento ? `nueva-${entrenamiento}` : "nueva"}
        plays={(plays ?? []) as TacticalPlay[]}
        teams={(teams ?? []) as Team[]}
        players={(players ?? []) as Player[]}
        trainings={typedTrainings}
        defaultTrainingId={entrenamiento ?? ""}
        defaultName={linked ? `Pizarra · ${linked.name}` : ""}
        defaultTeamId={linked?.team_id ?? ""}
      />
    </>
  );
}
