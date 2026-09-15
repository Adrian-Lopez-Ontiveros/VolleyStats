import type { Metadata } from "next";
import { Target } from "lucide-react";
import { GameLeaderboard } from "@/components/game/leaderboard";
import { PredictionsBoard } from "@/components/game/predictions-board";
import { RewardsDisclosure } from "@/components/game/rewards-grid";
import { PageHeader } from "@/components/page-header";
import { QueryError } from "@/components/query-error";
import { loadGamePageData } from "@/lib/actions/game";
import type { MatchPrediction } from "@/lib/types";

export const metadata: Metadata = { title: "Predicciones" };
export const dynamic = "force-dynamic";

export default async function PredictionsPage() {
  const data = await loadGamePageData();

  if (!data.ok) {
    if ("missingSchema" in data && data.missingSchema) {
      return (
        <QueryError message="Falta ejecutar la migración supabase/migrations/022_game.sql en Supabase para activar rachas, XP y predicciones." />
      );
    }
    return (
      <QueryError
        message={`No se pudieron cargar las predicciones: ${"error" in data ? data.error : ""}`}
      />
    );
  }

  const unlocked = data.rewards.map((row) => row.reward_id);
  const predictionMap: Record<string, MatchPrediction> = {};
  for (const [id, row] of data.predictions) predictionMap[id] = row;
  const community: Record<string, { home: number; away: number }> = {};
  for (const [id, split] of data.community) community[id] = split;

  return (
    <>
      <PageHeader
        title="Predicciones"
        description="Elige el ganador de la jornada más próxima. Un acierto vale 1 punto, un fallo 0."
        leading={
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-100 text-orange-700">
            <Target className="h-5 w-5" />
          </span>
        }
      />

      <div className="space-y-8">
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Jornada más próxima</h2>
          <PredictionsBoard
            jornadas={data.jornadas.filter((item) => item.canPredict || item.open)}
            predictions={predictionMap}
            community={community}
          />
        </section>

        {data.jornadas.some((item) => !item.canPredict && !item.open) ? (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Jornada anterior</h2>
            <PredictionsBoard
              jornadas={data.jornadas.filter((item) => !item.canPredict && !item.open)}
              predictions={predictionMap}
              community={community}
            />
          </section>
        ) : null}

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Clasificación</h2>
          <GameLeaderboard rows={data.leaderboard} userId={data.userId} />
        </section>

        <RewardsDisclosure unlockedIds={unlocked} progress={data.progress} />
      </div>
    </>
  );
}
