import type { Metadata } from "next";
import { Target } from "lucide-react";
import { GameLeaderboard } from "@/components/game/leaderboard";
import { PredictionsBoard } from "@/components/game/predictions-board";
import { ProgressCard } from "@/components/game/progress-card";
import { RewardsGrid } from "@/components/game/rewards-grid";
import { PageHeader } from "@/components/page-header";
import { QueryError } from "@/components/query-error";
import { loadGamePageData } from "@/lib/actions/game";
import { JORNADA_PERFECT_XP, PREDICTION_HIT_XP } from "@/lib/game";
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
        description="Solo la jornada más próxima. Elige ganador antes de que empiece el partido, entra cada día para la racha y sube de nivel."
        leading={
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-100 text-orange-700">
            <Target className="h-5 w-5" />
          </span>
        }
      />

      <div className="space-y-8">
        <ProgressCard progress={data.progress} />

        <section className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold">Jornada más próxima</h2>
            <p className="text-sm text-muted-foreground">
              Elige el ganador de cada partido del club. Cada acierto da {PREDICTION_HIT_XP} XP. Si
              clavas toda la jornada (mínimo 2 partidos) sumas {JORNADA_PERFECT_XP} XP extra.
            </p>
          </div>
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

        <section className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold">Recompensas</h2>
            <p className="text-sm text-muted-foreground">
              Títulos y marcos se desbloquean con nivel, racha y aciertos. Equípalos en tu perfil.
            </p>
          </div>
          <RewardsGrid unlockedIds={unlocked} progress={data.progress} />
        </section>
      </div>
    </>
  );
}
