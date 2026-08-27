import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Pencil, Plus } from "lucide-react";
import { BoardPreview } from "@/components/coach/board-preview";
import { DeleteTrainingButton } from "@/components/coach/delete-training-button";
import { TrainingFiles } from "@/components/coach/training-files";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireMember } from "@/lib/auth";
import {
  JUMP_ANALYSIS_SELECT,
  TACTICAL_PLAY_SELECT,
  TRAINING_DETAIL_SELECT,
  TRAINING_FILE_SELECT,
  hasCoachAccess,
} from "@/lib/constants";
import { formatJumpCm } from "@/lib/jump-analysis";
import { createClient } from "@/lib/supabase/server";
import { formatJersey } from "@/lib/utils";
import type { JumpAnalysisWithRelations, TacticalPlay, TrainingFile, TrainingWithTeam } from "@/lib/types";

export const metadata: Metadata = { title: "Entrenamiento" };

export default async function TrainingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireMember();
  const canEdit = hasCoachAccess(session.profile.role);
  const supabase = await createClient();
  const [{ data: training }, { data: files }, { data: jumps }, playsResult] = await Promise.all([
    supabase.from("trainings").select(TRAINING_DETAIL_SELECT as "*").eq("id", id).maybeSingle(),
    supabase
      .from("training_files")
      .select(TRAINING_FILE_SELECT as "*")
      .eq("training_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("jump_analyses")
      .select(JUMP_ANALYSIS_SELECT as "*")
      .eq("training_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("tactical_plays")
      .select(TACTICAL_PLAY_SELECT as "*")
      .eq("training_id", id)
      .order("updated_at", { ascending: false }),
  ]);
  const linkedPlays = (playsResult.error ? [] : playsResult.data ?? []) as TacticalPlay[];

  if (!training) notFound();
  const typed = training as TrainingWithTeam;
  const sessionJumps = (jumps ?? []) as JumpAnalysisWithRelations[];

  return (
    <>
      <PageHeader
        title={typed.name}
        description={format(new Date(typed.scheduled_at), "EEEE d MMMM yyyy · HH:mm", {
          locale: es,
        })}
        action={
          canEdit ? (
            <Button asChild size="sm" variant="outline">
              <Link href={`/entrenador/entrenamientos/${id}/editar`}>
                <Pencil className="h-4 w-4" />
                Editar
              </Link>
            </Button>
          ) : undefined
        }
      />

      <Card className="mb-6">
        <CardContent className="space-y-2 p-4 text-sm">
          <Row label="Equipo" value={typed.team?.name ?? "Sin equipo concreto"} />
          <Row
            label="Notas"
            value={typed.notes?.trim() ? typed.notes : "Sin notas"}
          />
        </CardContent>
      </Card>

      <section className="mb-8 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Pizarra del ejercicio</h2>
          {canEdit ? (
            <Button asChild size="sm" variant="outline">
              <Link href={`/entrenador/pizarra?entrenamiento=${id}`}>
                <Plus className="h-4 w-4" />
                Nueva pizarra
              </Link>
            </Button>
          ) : null}
        </div>
        {linkedPlays.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {canEdit
              ? "Todavía no hay una pizarra vinculada. Crea una para colocar jugadores, conos y aros."
              : "Todavía no hay una pizarra vinculada a esta sesión."}
          </p>
        ) : (
          <div className="space-y-3">
            {linkedPlays.map((item) => (
              <Card key={item.id}>
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold">{item.name}</p>
                      {item.notes ? (
                        <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">
                          {item.notes}
                        </p>
                      ) : null}
                    </div>
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/entrenador/pizarra/${item.id}`}>Abrir</Link>
                    </Button>
                  </div>
                  <BoardPreview board={item.board} uid={item.id} />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <TrainingFiles trainingId={id} files={(files ?? []) as TrainingFile[]} canEdit={canEdit} />

      {sessionJumps.length > 0 ? (
        <section className="mt-8 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Saltos de esta sesión</h2>
            <Button asChild size="sm" variant="outline">
              <Link href="/entrenador/saltos">Ver todos</Link>
            </Button>
          </div>
          {sessionJumps.map((jump) => (
            <Card key={jump.id}>
              <CardContent className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="truncate font-semibold">
                    {jump.player
                      ? `${formatJersey(jump.player.jersey_number)} ${jump.player.full_name}`
                      : "Jugador"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {jump.source === "auto" ? "Automático" : "Manual"}
                  </p>
                </div>
                <p className="text-lg font-bold tabular-nums">
                  {formatJumpCm(Number(jump.height_cm))}
                </p>
              </CardContent>
            </Card>
          ))}
        </section>
      ) : null}

      {canEdit ? (
        <div className="mt-8">
          <DeleteTrainingButton trainingId={id} />
        </div>
      ) : null}
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="text-right font-medium whitespace-pre-wrap">{value}</span>
    </div>
  );
}
