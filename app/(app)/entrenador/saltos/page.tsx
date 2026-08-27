import type { Metadata } from "next";
import { JumpAnalyzer } from "@/components/coach/jump-analyzer";
import { PageHeader } from "@/components/page-header";
import { requireMember } from "@/lib/auth";
import { JUMP_ANALYSIS_SELECT, PLAYER_LINEUP_SELECT, hasCoachAccess } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import type { JumpAnalysisWithRelations, Player, Training } from "@/lib/types";

export const metadata: Metadata = { title: "Salto vertical" };

export default async function JumpsPage() {
  const session = await requireMember();
  const canEdit = hasCoachAccess(session.profile.role);
  const supabase = await createClient();
  const [{ data: players }, { data: trainings }, { data: jumps }] = await Promise.all([
    supabase
      .from("players")
      .select(PLAYER_LINEUP_SELECT as "*")
      .order("full_name"),
    supabase
      .from("trainings")
      .select("id, name, scheduled_at, team_id")
      .order("scheduled_at", { ascending: false })
      .limit(40),
    supabase
      .from("jump_analyses")
      .select(JUMP_ANALYSIS_SELECT as "*")
      .order("created_at", { ascending: false })
      .limit(40),
  ]);

  return (
    <>
      <PageHeader
        title="Salto vertical"
        description={
          canEdit
            ? "Sube un vídeo corto, calcula la altura o introdúcela a mano y asóciala al jugador."
            : "Histórico de saltos del equipo."
        }
      />
      <JumpAnalyzer
        players={(players ?? []) as Player[]}
        trainings={(trainings ?? []) as Pick<Training, "id" | "name" | "scheduled_at" | "team_id">[]}
        jumps={(jumps ?? []) as JumpAnalysisWithRelations[]}
        canEdit={canEdit}
      />
    </>
  );
}
