import type { Metadata } from "next";
import Link from "next/link";
import { PenLine } from "lucide-react";
import { BoardPreview } from "@/components/coach/board-preview";
import { TacticalBoard } from "@/components/coach/tactical-board";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { requireMember } from "@/lib/auth";
import { PLAYER_LINEUP_SELECT, TACTICAL_PLAY_SELECT, TEAM_SELECT, hasCoachAccess } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import type { Player, TacticalPlay, Team, Training } from "@/lib/types";

export const metadata: Metadata = { title: "Pizarra táctica" };

export default async function BoardPage({
  searchParams,
}: {
  searchParams: Promise<{ entrenamiento?: string }>;
}) {
  const { entrenamiento } = await searchParams;
  const session = await requireMember();
  const canEdit = hasCoachAccess(session.profile.role);
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

  const typedPlays = (plays ?? []) as TacticalPlay[];
  const typedTrainings = (trainings ?? []) as Pick<Training, "id" | "name" | "scheduled_at" | "team_id">[];
  const linked = typedTrainings.find((item) => item.id === entrenamiento);

  if (!canEdit) {
    return (
      <>
        <PageHeader
          title="Pizarra táctica"
          description="Jugadas que el entrenador ha preparado para el equipo."
        />
        {typedPlays.length === 0 ? (
          <EmptyState
            icon={PenLine}
            title="Todavía no hay pizarras"
            description="Cuando el entrenador publique una jugada, la verás aquí."
          />
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {typedPlays.map((item) => (
              <Link key={item.id} href={`/entrenador/pizarra/${item.id}`} className="block">
                <Card className="h-full transition-transform active:scale-[0.99]">
                  <CardContent className="space-y-3 p-4">
                    <p className="font-semibold">{item.name}</p>
                    {item.notes ? (
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{item.notes}</p>
                    ) : null}
                    <BoardPreview board={item.board} uid={item.id} />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Pizarra táctica"
        description="Coloca jugadores, balones y material para explicar el ejercicio."
      />
      <TacticalBoard
        key={entrenamiento ? `nueva-${entrenamiento}` : "nueva"}
        plays={typedPlays}
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
