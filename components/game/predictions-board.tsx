"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { saveMatchPrediction } from "@/lib/actions/game";
import { formatMatchWhen } from "@/lib/federation/schedule";
import { isPredictionLocked } from "@/lib/game";
import {
  clearPredictionDraft,
  getPredictionDraft,
  setPredictionDraft,
} from "@/lib/prediction-drafts";
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
  const now = useClock();
  if (jornadas.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Cuando haya una jornada próxima del club, podrás predecir el ganador de cada partido.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {jornadas.map((jornada) => (
        <section key={jornada.key} className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">{jornada.label}</h3>
            {jornadaPhase(jornada, now) === "open" ? (
              <Badge className="border-sky-800 bg-sky-600 text-white">Abierta</Badge>
            ) : jornadaPhase(jornada, now) === "live" ? (
              <Badge className="border-orange-800 bg-orange-500 text-white">En juego</Badge>
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
                canPredict={jornada.canPredict}
                now={now}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function useClock(intervalMs = 15000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

function jornadaPhase(jornada: JornadaBoard, now: number) {
  const predictable = jornada.matches.some(
    (match) =>
      jornada.canPredict &&
      match.status === "scheduled" &&
      !isPredictionLocked(match.scheduled_at, now)
  );
  if (predictable) return "open" as const;
  if (jornada.matches.some((match) => match.status === "live")) return "live" as const;
  return "closed" as const;
}

function PredictionMatch({
  match,
  prediction,
  split,
  canPredict,
  now,
}: {
  match: MatchWithTeams;
  prediction: MatchPrediction | null;
  split: { home: number; away: number };
  canPredict: boolean;
  now: number;
}) {
  const timeLocked = match.status === "scheduled" && isPredictionLocked(match.scheduled_at, now);
  const locked = match.status !== "scheduled" || !canPredict || timeLocked;
  const serverId = prediction?.predicted_winner_id ?? null;
  const [selectedId, setSelectedId] = useState(serverId);
  const desiredRef = useRef(serverId);
  const savedRef = useRef(serverId);
  const savingRef = useRef(false);
  const liveSplit = applyOwnVote(
    split,
    match.home_team_id,
    match.away_team_id,
    serverId,
    selectedId
  );
  const total = liveSplit.home + liveSplit.away;
  const winnerId =
    match.status === "finished" && match.home_sets !== match.away_sets
      ? match.home_sets > match.away_sets
        ? match.home_team_id
        : match.away_team_id
      : null;

  async function flush() {
    if (locked || savingRef.current) return;
    const next = desiredRef.current;
    if (!next || next === savedRef.current) return;

    savingRef.current = true;
    const result = await saveMatchPrediction(match.id, next);
    savingRef.current = false;

    if ("error" in result && result.error) {
      if (desiredRef.current === next) {
        desiredRef.current = savedRef.current;
        setSelectedId(savedRef.current);
        clearPredictionDraft(match.id, next);
        toast.error(result.error);
      }
      return;
    }

    savedRef.current = next;
    if (desiredRef.current === next) {
      clearPredictionDraft(match.id, next);
    } else {
      void flush();
    }
  }

  useEffect(() => {
    if (locked) {
      savedRef.current = serverId;
      desiredRef.current = serverId;
      setSelectedId(serverId);
      return;
    }
    const draft = getPredictionDraft(match.id);
    if (draft) {
      desiredRef.current = draft;
      setSelectedId(draft);
      void flush();
      return;
    }
    savedRef.current = serverId;
    desiredRef.current = serverId;
    setSelectedId(serverId);
    // hydrate from local draft; do not let a stale server payload overwrite a newer pick
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match.id, locked]);

  function pick(teamId: string) {
    if (locked || teamId === selectedId) return;
    desiredRef.current = teamId;
    setSelectedId(teamId);
    setPredictionDraft(match.id, teamId);
    void flush();
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
            selected={selectedId === match.home_team_id}
            locked={locked}
            result={
              winnerId == null
                ? null
                : winnerId === match.home_team_id
                  ? selectedId === match.home_team_id
                    ? "hit"
                    : selectedId
                      ? "miss"
                      : "won"
                  : selectedId === match.home_team_id
                    ? "miss"
                    : null
            }
            percent={total ? Math.round((liveSplit.home / total) * 100) : null}
            onPick={() => pick(match.home_team_id)}
          />
          <TeamPick
            team={match.away_team}
            selected={selectedId === match.away_team_id}
            locked={locked}
            result={
              winnerId == null
                ? null
                : winnerId === match.away_team_id
                  ? selectedId === match.away_team_id
                    ? "hit"
                    : selectedId
                      ? "miss"
                      : "won"
                  : selectedId === match.away_team_id
                    ? "miss"
                    : null
            }
            percent={total ? Math.round((liveSplit.away / total) * 100) : null}
            onPick={() => pick(match.away_team_id)}
          />
        </div>

        {match.status === "finished" ? (
          <p className="text-center text-xs text-muted-foreground">
            Resultado {match.home_sets}–{match.away_sets}
            {prediction?.is_correct
              ? " · Acertaste · +1 punto"
              : prediction
                ? " · Fallaste · 0 puntos"
                : " · No pronosticaste"}
          </p>
        ) : match.status === "live" ? (
          <p className="text-center text-xs font-medium text-orange-700">En juego · predicción cerrada</p>
        ) : timeLocked ? (
          <p className="text-center text-xs text-muted-foreground">
            Las predicciones se cierran 5 minutos antes del partido
          </p>
        ) : canPredict ? (
          <p className="text-center text-xs text-muted-foreground">
            Toca el equipo que crees que gana. Se cierra 5 minutos antes.
          </p>
        ) : (
          <p className="text-center text-xs text-muted-foreground">
            Solo se predice la jornada más próxima
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function applyOwnVote(
  split: { home: number; away: number },
  homeId: string,
  awayId: string,
  countedId: string | null,
  selectedId: string | null
) {
  if (countedId === selectedId) return split;
  const next = { home: split.home, away: split.away };
  if (countedId === homeId) next.home = Math.max(0, next.home - 1);
  if (countedId === awayId) next.away = Math.max(0, next.away - 1);
  if (selectedId === homeId) next.home += 1;
  if (selectedId === awayId) next.away += 1;
  return next;
}

function TeamPick({
  team,
  selected,
  locked,
  result,
  percent,
  onPick,
}: {
  team: MatchWithTeams["home_team"];
  selected: boolean;
  locked: boolean;
  result: "hit" | "miss" | "won" | null;
  percent: number | null;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      disabled={locked}
      className={cn(
        "flex flex-col items-center gap-1.5 rounded-2xl border px-2 py-3 text-center transition-colors",
        selected && !result && "border-orange-500 bg-orange-50 text-orange-950 dark:bg-orange-500/15 dark:text-orange-50",
        result === "hit" && "border-emerald-600 bg-emerald-50 text-emerald-950 dark:bg-emerald-500/15 dark:text-emerald-50",
        result === "miss" && "border-rose-400 bg-rose-50 text-rose-950 dark:bg-rose-500/15 dark:text-rose-50",
        result === "won" && "border-emerald-300 bg-emerald-50/60 text-emerald-950 dark:border-emerald-400/40 dark:bg-emerald-500/10 dark:text-emerald-50",
        !selected && !result && "bg-background hover:border-orange-300",
        locked && "cursor-default"
      )}
    >
      <TeamLogo
        name={team.name}
        shortName={team.short_name}
        logoUrl={team.logo_url}
        federationTeamId={team.federation_team_id}
        size="sm"
      />
      <span className="line-clamp-2 text-xs font-semibold leading-tight">{team.name}</span>
      {percent != null ? (
        <span className="text-[10px] opacity-75">{percent}% de la afición</span>
      ) : null}
    </button>
  );
}
