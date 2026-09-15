"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { saveMatchPrediction } from "@/lib/actions/game";
import { formatMatchWhen } from "@/lib/federation/schedule";
import { PREDICTION_HIT_XP } from "@/lib/game";
import { cn } from "@/lib/utils";
import { TeamLogo } from "@/components/teams/team-logo";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { JornadaBoard, MatchPrediction, MatchWithTeams } from "@/lib/types";

export function PredictionsBoard({
  jornadas,
  predictions,
  community,
}: {
  jornadas: JornadaBoard[];
  predictions: Record<string, MatchPrediction>;
  community: Record<string, { home: number; away: number }>;
}) {
  if (jornadas.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Cuando haya partidos del club, podrás predecir el ganador de cada uno.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {jornadas.map((jornada) => (
        <section key={jornada.key} className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">{jornada.label}</h3>
            {jornada.open ? (
              <Badge className="border-sky-800 bg-sky-600 text-white">Abierta</Badge>
            ) : (
              <Badge variant="secondary">Cerrada</Badge>
            )}
          </div>
          <div className="space-y-2">
            {jornada.matches.map((match) => (
              <PredictionMatch
                key={match.id}
                match={match}
                prediction={predictions[match.id] ?? null}
                split={community[match.id] ?? { home: 0, away: 0 }}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function PredictionMatch({
  match,
  prediction,
  split,
}: {
  match: MatchWithTeams;
  prediction: MatchPrediction | null;
  split: { home: number; away: number };
}) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const locked = match.status !== "scheduled";
  const total = split.home + split.away;
  const winnerId =
    match.status === "finished" && match.home_sets !== match.away_sets
      ? match.home_sets > match.away_sets
        ? match.home_team_id
        : match.away_team_id
      : null;

  async function pick(teamId: string) {
    if (locked) return;
    setPending(teamId);
    const result = await saveMatchPrediction(match.id, teamId);
    setPending(null);
    if (result.error) toast.error(result.error);
    else {
      toast.success("Predicción guardada");
      router.refresh();
    }
  }

  return (
    <Card>
      <CardContent className="space-y-3 p-3">
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>
            {formatMatchWhen({
              scheduledAt: match.scheduled_at,
              notes: match.notes,
              isFederation: match.is_federation,
            })}
          </span>
          <Link href={`/partidos/${match.id}`} className="font-medium text-accent hover:underline">
            Ver partido
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <TeamPick
            team={match.home_team}
            selected={prediction?.predicted_winner_id === match.home_team_id}
            locked={locked}
            pending={pending === match.home_team_id}
            result={
              winnerId == null
                ? null
                : winnerId === match.home_team_id
                  ? prediction?.predicted_winner_id === match.home_team_id
                    ? "hit"
                    : prediction
                      ? "miss"
                      : "won"
                  : prediction?.predicted_winner_id === match.home_team_id
                    ? "miss"
                    : null
            }
            percent={total ? Math.round((split.home / total) * 100) : null}
            onPick={() => pick(match.home_team_id)}
          />
          <TeamPick
            team={match.away_team}
            selected={prediction?.predicted_winner_id === match.away_team_id}
            locked={locked}
            pending={pending === match.away_team_id}
            result={
              winnerId == null
                ? null
                : winnerId === match.away_team_id
                  ? prediction?.predicted_winner_id === match.away_team_id
                    ? "hit"
                    : prediction
                      ? "miss"
                      : "won"
                  : prediction?.predicted_winner_id === match.away_team_id
                    ? "miss"
                    : null
            }
            percent={total ? Math.round((split.away / total) * 100) : null}
            onPick={() => pick(match.away_team_id)}
          />
        </div>

        {match.status === "finished" ? (
          <p className="text-center text-xs text-muted-foreground">
            Resultado {match.home_sets}–{match.away_sets}
            {prediction?.is_correct
              ? ` · Acertaste · +${prediction.xp_awarded || PREDICTION_HIT_XP} XP`
              : prediction
                ? " · Esta no la clavaste"
                : " · No pronosticaste"}
          </p>
        ) : match.status === "live" ? (
          <p className="text-center text-xs font-medium text-orange-700">En juego · predicción cerrada</p>
        ) : (
          <p className="text-center text-xs text-muted-foreground">Toca el equipo que crees que gana</p>
        )}
      </CardContent>
    </Card>
  );
}

function TeamPick({
  team,
  selected,
  locked,
  pending,
  result,
  percent,
  onPick,
}: {
  team: MatchWithTeams["home_team"];
  selected: boolean;
  locked: boolean;
  pending: boolean;
  result: "hit" | "miss" | "won" | null;
  percent: number | null;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      disabled={locked || pending}
      className={cn(
        "flex flex-col items-center gap-1.5 rounded-2xl border px-2 py-3 text-center transition",
        selected && !result && "border-orange-500 bg-orange-50",
        result === "hit" && "border-emerald-600 bg-emerald-50",
        result === "miss" && "border-rose-400 bg-rose-50",
        result === "won" && "border-emerald-300 bg-emerald-50/60",
        !selected && !result && "bg-background hover:border-orange-300",
        (locked || pending) && "cursor-default"
      )}
    >
      <TeamLogo
        name={team.name}
        shortName={team.short_name}
        logoUrl={team.logo_url}
        federationTeamId={team.federation_team_id}
        size="sm"
      />
      <span className="line-clamp-2 text-xs font-semibold leading-tight">{team.short_name || team.name}</span>
      {percent != null ? (
        <span className="text-[10px] text-muted-foreground">{percent}% de la afición</span>
      ) : null}
    </button>
  );
}
