import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardList, Plus } from "lucide-react";
import { TrainingCard } from "@/components/coach/training-card";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { requireCoach } from "@/lib/auth";
import { TRAINING_LIST_SELECT } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import type { TrainingWithTeam } from "@/lib/types";

export const metadata: Metadata = { title: "Entrenador" };

export default async function CoachTrainingsPage() {
  await requireCoach();
  const supabase = await createClient();
  const { data } = await supabase
    .from("trainings")
    .select(TRAINING_LIST_SELECT as "*")
    .order("scheduled_at", { ascending: false });

  const trainings = (data ?? []) as TrainingWithTeam[];

  return (
    <>
      <PageHeader
        title="Entrenamientos"
        description="Crea sesiones, adjunta vídeos y revisa el material del equipo."
        action={
          <Button asChild size="sm" variant="accent">
            <Link href="/entrenador/entrenamientos/nuevo">
              <Plus className="h-4 w-4" />
              Nuevo
            </Link>
          </Button>
        }
      />

      {trainings.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Aún no hay entrenamientos"
          description="Crea el primero para guardar ejercicios, notas y vídeos de la sesión."
          action={
            <Button asChild variant="accent">
              <Link href="/entrenador/entrenamientos/nuevo">Crear entrenamiento</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
          {trainings.map((training) => (
            <TrainingCard key={training.id} training={training} />
          ))}
        </div>
      )}
    </>
  );
}
