import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TrainingForm } from "@/components/coach/training-form";
import { PageHeader } from "@/components/page-header";
import { requireCoach } from "@/lib/auth";
import { TEAM_SELECT } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import type { Team, Training } from "@/lib/types";

export const metadata: Metadata = { title: "Editar entrenamiento" };

export default async function EditTrainingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireCoach();
  const supabase = await createClient();
  const [{ data: training }, { data: teams }] = await Promise.all([
    supabase
      .from("trainings")
      .select("id, name, scheduled_at, team_id, notes, created_by, created_at, updated_at")
      .eq("id", id)
      .maybeSingle(),
    supabase.from("teams").select(TEAM_SELECT as "*").order("name"),
  ]);

  if (!training) notFound();

  return (
    <>
      <PageHeader title="Editar entrenamiento" />
      <TrainingForm training={training as Training} teams={(teams ?? []) as Team[]} />
    </>
  );
}
