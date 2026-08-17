import type { Metadata } from "next";
import { TrainingForm } from "@/components/coach/training-form";
import { PageHeader } from "@/components/page-header";
import { requireCoach } from "@/lib/auth";
import { TEAM_SELECT } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import type { Team } from "@/lib/types";

export const metadata: Metadata = { title: "Nuevo entrenamiento" };

export default async function NewTrainingPage() {
  await requireCoach();
  const supabase = await createClient();
  const { data: teams } = await supabase
    .from("teams")
    .select(TEAM_SELECT as "*")
    .order("name");

  return (
    <>
      <PageHeader
        title="Nuevo entrenamiento"
        description="Nombre, fecha, equipo y notas. Los vídeos se suben después."
      />
      <TrainingForm teams={(teams ?? []) as Team[]} />
    </>
  );
}
