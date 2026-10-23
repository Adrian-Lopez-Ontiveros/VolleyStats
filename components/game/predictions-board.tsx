"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check, X } from "lucide-react";
import { AppLogo } from "@/components/app-logo";
import { toast } from "sonner";
import { saveMatchPrediction } from "@/lib/actions/game";
import { setsToWinOf } from "@/lib/constants";
import { formatMatchWhen } from "@/lib/federation/schedule";
import { isPredictionLocked, predictionLocksAt } from "@/lib/game";
import {
  clearPredictionDraft,
  getPredictionDraft,
  setPredictionDraft,
  type PredictionDraft,
} from "@/lib/prediction-drafts";
import { exactScoreOptions, isExactScoreForWinner } from "@/lib/prediction-score";
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
      <div className="rounded-3xl border bg-card px-6 py-10 text-center shadow-card">
        <AppLogo
          src="/predictions-logo.png"
          className="mx-auto mb-4 h-16 w-14 text-orange-700 dark:text-orange-200"
        />
        <h3 className="text-lg font-bold">Aún no hay jornada para predecir</h3>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
          Cuando salga el próximo partido del club, elige aquí quién gana y, si quieres, el resultado.
          El equipo suma 1 punto y el marcador exacto suma 2.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {jornadas.map((jornada) => {
        const phase = jornadaPhase(jornada, now);
        return (
          <section key={jornada.key} className="space-y-3">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-orange-700 dark:text-orange-300">
                  {phase === "open" ? "Se puede jugar" : phase === "live" ? "En juego" : "Ya cerrada"}
                </p>
                <h3 className="text-lg font-bold leading-tight">{jornada.label}</h3>
              </div>
              {phase === "open" ? (
                <Badge className="border-sky-800 bg-sky-600 text-white">Abierta</Badge>
              ) : phase === "live" ? (
                <Badge className="border-orange-800 bg-orange-500 text-white">En juego</Badge>
              ) : (
                <Badge variant="secondary">Cerrada</Badge>
              )}
            </div>
            {phase === "open" ? (
              <p className="text-sm text-muted-foreground">
                Toca el escudo del equipo que crees que gana y, si quieres, el resultado. El equipo suma
                1 punto y el marcador exacto suma 2. Se cierra 5 minutos antes del saque.
              </p>
            ) : null}
            <div className="space-y-3">
              {jornada.matches.map((match) => (
                <div key={match.id} id={`pred-${match.id}`} className="scroll-mt-24">
                  <PredictionMatch
                    match={match}
                    prediction={predictions[match.id] ?? null}
                    split={community[match.id] ?? { home: 0, away: 0 }}
                    canPredict={jornada.canPredict}
                    now={now}
                  />
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

export function QuinielaStrip({
  points,
  hits,
  played,
}: {
  points: number;
  hits: number;
  played: number;
}) {
  const rate = played > 0 ? Math.round((hits / played) * 100) : null;

  return (
    <section className="overflow-hidden rounded-3xl bg-primary text-primary-foreground shadow-card">
      <div className="flex items-center justify-between gap-4 px-5 py-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-orange-200">
            Tu quiniela
          </p>
          <p className="mt-1 text-4xl font-black tabular-nums leading-none">{points}</p>
          <p className="mt-1 text-sm text-orange-100">
            {points === 1 ? "punto" : "puntos"} · {played} {played === 1 ? "pronóstico" : "pronósticos"}
          </p>
        </div>
        <div className="rounded-2xl bg-white/10 px-4 py-3 text-center">
          <p className="text-2xl font-black tabular-nums leading-none">{rate == null ? "–" : `${rate}%`}</p>
          <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-orange-100">acierto</p>
        </div>
      </div>
    </section>
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

type LocalPick = {
  winnerId: string | null;
  homeSets: number | null;
  awaySets: number | null;
};

function localPickFromPrediction(prediction: MatchPrediction | null): LocalPick {
  return {
    winnerId: prediction?.predicted_winner_id ?? null,
    homeSets: prediction?.predicted_home_sets ?? null,
    awaySets: prediction?.predicted_away_sets ?? null,
  };
}

function pickKey(pick: LocalPick) {
  return `${pick.winnerId ?? ""}:${pick.homeSets ?? ""}-${pick.awaySets ?? ""}`;
}

function draftFromPick(pick: LocalPick): PredictionDraft | null {
  if (!pick.winnerId) return null;
  return { winnerId: pick.winnerId, homeSets: pick.homeSets, awaySets: pick.awaySets };
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
  const setsToWin = setsToWinOf(match);
  const timeLocked = match.status === "scheduled" && isPredictionLocked(match.scheduled_at, now);
  const locked = match.status !== "scheduled" || !canPredict || timeLocked;
  const serverPick = localPickFromPrediction(prediction);
  const [selected, setSelected] = useState(serverPick);
  const desiredRef = useRef(serverPick);
  const savedRef = useRef(serverPick);
  const savingRef = useRef(false);
  const selectedId = selected.winnerId;
  const liveSplit = applyOwnVote(
    split,
    match.home_team_id,
    match.away_team_id,
    serverPick.winnerId,
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
    if (!next.winnerId || pickKey(next) === pickKey(savedRef.current)) return;

    savingRef.current = true;
    const result = await saveMatchPrediction(match.id, next.winnerId, next.homeSets, next.awaySets);
    savingRef.current = false;

    if ("error" in result && result.error) {
      if (pickKey(desiredRef.current) === pickKey(next)) {
        desiredRef.current = savedRef.current;
        setSelected(savedRef.current);
        const failed = draftFromPick(next);
        if (failed) clearPredictionDraft(match.id, failed);
        toast.error(result.error);
      }
      return;
    }

    savedRef.current = next;
    if (pickKey(desiredRef.current) === pickKey(next)) {
      const saved = draftFromPick(next);
      if (saved) clearPredictionDraft(match.id, saved);
    } else {
      void flush();
    }
  }

  useEffect(() => {
    if (locked) {
      savedRef.current = serverPick;
      desiredRef.current = serverPick;
      setSelected(serverPick);
      return;
    }
    const draft = getPredictionDraft(match.id);
    if (
      draft &&
      (draft.winnerId === match.home_team_id || draft.winnerId === match.away_team_id)
    ) {
      const side = draft.winnerId === match.home_team_id ? "home" : "away";
      const scoreOk =
        draft.homeSets != null &&
        draft.awaySets != null &&
        isExactScoreForWinner({ home: draft.homeSets, away: draft.awaySets }, side, setsToWin);
      const next: LocalPick = {
        winnerId: draft.winnerId,
        homeSets: scoreOk ? draft.homeSets : null,
        awaySets: scoreOk ? draft.awaySets : null,
      };
      setPredictionDraft(match.id, {
        winnerId: draft.winnerId,
        homeSets: next.homeSets,
        awaySets: next.awaySets,
      });
      desiredRef.current = next;
      setSelected(next);
      void flush();
      return;
    }
    savedRef.current = serverPick;
    desiredRef.current = serverPick;
    setSelected(serverPick);
    // hydrate from local draft; do not let a stale server payload overwrite a newer pick
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match.id, locked]);

  function remember(next: LocalPick) {
    desiredRef.current = next;
    setSelected(next);
    const draft = draftFromPick(next);
    if (draft) setPredictionDraft(match.id, draft);
    void flush();
  }

  function pick(teamId: string) {
    if (locked || teamId === selectedId) return;
    remember({ winnerId: teamId, homeSets: null, awaySets: null });
  }

  function pickScore(home: number, away: number) {
    if (locked || !selectedId) return;
    if (selected.homeSets === home && selected.awaySets === away) {
      remember({ winnerId: selectedId, homeSets: null, awaySets: null });
      return;
    }
    remember({ winnerId: selectedId, homeSets: home, awaySets: away });
  }

  const homePercent = total ? Math.round((liveSplit.home / total) * 100) : 0;
  const awayPercent = total ? 100 - homePercent : 0;
  const homeResult = pickResult(winnerId, match.home_team_id, selectedId);
  const awayResult = pickResult(winnerId, match.away_team_id, selectedId);
  const closing = !locked && canPredict ? closesIn(match.scheduled_at, now) : null;
  const scoreSide =
    selectedId === match.home_team_id ? "home" : selectedId === match.away_team_id ? "away" : null;
  const saidScore =
    selected.homeSets != null && selected.awaySets != null
      ? `${selected.homeSets}–${selected.awaySets}`
      : null;
  const showScores = scoreSide != null && (!locked || saidScore != null);
  const scoreOptions = scoreSide ? exactScoreOptions(scoreSide, setsToWin) : [];
  const teamHit =
    match.status !== "finished"
      ? false
      : prediction?.is_correct != null
        ? prediction.is_correct
        : winnerId != null && selectedId === winnerId;
  const exactHit =
    teamHit && saidScore != null && selected.homeSets === match.home_sets && selected.awaySets === match.away_sets;
  const finishedLabel = finishedCopy(match.home_sets, match.away_sets, Boolean(prediction || selectedId), teamHit, exactHit, saidScore);

  return (
    <Card className="overflow-hidden">
      <CardContent className="space-y-3 p-3 sm:p-4">
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>
            {formatMatchWhen({
              scheduledAt: match.scheduled_at,
              notes: match.notes,
              isFederation: match.is_federation,
            })}
          </span>
          <Link href={`/partidos/${match.id}`} className="font-semibold text-accent hover:underline">
            Ver partido
          </Link>
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] items-stretch gap-2">
          <TeamPick
            team={match.home_team}
            selected={selectedId === match.home_team_id}
            locked={locked}
            result={homeResult}
            onPick={() => pick(match.home_team_id)}
          />
          <div className="flex items-center text-[11px] font-black tracking-wide text-muted-foreground">VS</div>
          <TeamPick
            team={match.away_team}
            selected={selectedId === match.away_team_id}
            locked={locked}
            result={awayResult}
            onPick={() => pick(match.away_team_id)}
          />
        </div>

        {showScores ? (
          <div className="space-y-1.5">
            <p className="text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Resultado exacto{locked ? "" : " · opcional"}
            </p>
            <div className={cn("grid gap-2", scoreOptions.length === 2 ? "grid-cols-2" : "grid-cols-3")}>
              {scoreOptions.map((option) => {
                const chosen = selected.homeSets === option.home && selected.awaySets === option.away;
                const exact = match.status === "finished" && chosen && exactHit;
                const wrong = match.status === "finished" && chosen && !exactHit;
                return (
                  <button
                    key={`${option.home}-${option.away}`}
                    type="button"
                    onClick={() => pickScore(option.home, option.away)}
                    disabled={locked}
                    aria-pressed={chosen}
                    aria-label={`Resultado ${option.home} a ${option.away}`}
                    className={cn(
                      "rounded-xl border px-2 py-2 text-sm font-black tabular-nums transition-colors",
                      chosen &&
                        !exact &&
                        !wrong &&
                        "border-orange-500 bg-orange-50 text-orange-950 ring-2 ring-orange-400/70 dark:bg-orange-500/15 dark:text-orange-50 dark:ring-orange-400/40",
                      exact && "border-emerald-600 bg-emerald-50 text-emerald-950 dark:bg-emerald-500/15 dark:text-emerald-50",
                      wrong && "border-rose-400 bg-rose-50 text-rose-950 dark:bg-rose-500/15 dark:text-rose-50",
                      !chosen && "bg-background hover:border-orange-300",
                      locked && "cursor-default",
                      !locked && "active:scale-[0.98]"
                    )}
                  >
                    {option.home}–{option.away}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {total > 0 ? (
          <div>
            <div className="flex h-2 overflow-hidden rounded-full bg-secondary">
              <div className="bg-orange-500" style={{ width: `${homePercent}%` }} />
              <div className="bg-primary" style={{ width: `${awayPercent}%` }} />
            </div>
            <div className="mt-1.5 flex justify-between text-[11px] font-semibold tabular-nums text-muted-foreground">
              <span>
                {homePercent}% {match.home_team.short_name || "Local"}
              </span>
              <span>
                {awayPercent}% {match.away_team.short_name || "Visitante"}
              </span>
            </div>
          </div>
        ) : null}

        {match.status === "finished" ? (
          <p
            className={cn(
              "rounded-xl px-3 py-2 text-center text-sm font-semibold",
              teamHit
                ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-100"
                : prediction || selectedId
                  ? "bg-rose-500/10 text-rose-800 dark:text-rose-100"
                  : "bg-secondary text-secondary-foreground"
            )}
          >
            {finishedLabel}
          </p>
        ) : match.status === "live" ? (
          <p className="text-center text-xs font-semibold text-orange-700 dark:text-orange-200">
            En juego · la predicción ya está cerrada
          </p>
        ) : timeLocked ? (
          <p className="text-center text-xs text-muted-foreground">Cerrada 5 minutos antes del saque</p>
        ) : closing ? (
          <p className="text-center text-xs font-semibold text-sky-800 dark:text-sky-200">{closing}</p>
        ) : canPredict ? null : (
          <p className="text-center text-xs text-muted-foreground">Solo se predice la jornada más próxima</p>
        )}
      </CardContent>
    </Card>
  );
}

function finishedCopy(
  homeSets: number,
  awaySets: number,
  hasPick: boolean,
  teamHit: boolean,
  exactHit: boolean,
  saidScore: string | null
) {
  const score = `${homeSets}–${awaySets}`;
  if (!hasPick) return `${score} · No pronosticaste`;
  if (!teamHit) return saidScore ? `${score} · Esta vez no · dijiste ${saidScore}` : `${score} · Esta vez no`;
  if (exactHit) return `${score} · Resultado exacto, +2 puntos`;
  return saidScore
    ? `${score} · Acertaste el equipo (dijiste ${saidScore}), +1 punto`
    : `${score} · Acertaste el equipo, +1 punto`;
}

function pickResult(winnerId: string | null, teamId: string, selectedId: string | null) {
  if (winnerId == null) return null;
  if (winnerId === teamId) return selectedId === teamId ? ("hit" as const) : ("won" as const);
  if (selectedId === teamId) return "miss" as const;
  return null;
}

function closesIn(scheduledAt: string, now: number) {
  const locksAt = predictionLocksAt(scheduledAt);
  if (locksAt == null || locksAt <= now) return null;
  const minutes = Math.max(1, Math.round((locksAt - now) / 60000));
  if (minutes < 60) return `Cierra en ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `Cierra en ${hours} h`;
  return `Cierra en ${Math.round(hours / 24)} días`;
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
  onPick,
}: {
  team: MatchWithTeams["home_team"];
  selected: boolean;
  locked: boolean;
  result: "hit" | "miss" | "won" | null;
  onPick: () => void;
}) {
  const mark =
    result === "hit" ? "Acierto" : result === "miss" ? "Tu pick" : result === "won" ? "Ganó" : selected ? "Tu pick" : null;

  return (
    <button
      type="button"
      onClick={onPick}
      disabled={locked}
      className={cn(
        "flex min-h-[8.5rem] flex-col items-center justify-center gap-2 rounded-2xl border px-2 py-3 text-center transition-colors",
        selected && !result && "border-orange-500 bg-orange-50 text-orange-950 shadow-sm ring-2 ring-orange-400/70 dark:bg-orange-500/15 dark:text-orange-50 dark:ring-orange-400/40",
        result === "hit" && "border-emerald-600 bg-emerald-50 text-emerald-950 dark:bg-emerald-500/15 dark:text-emerald-50",
        result === "miss" && selected && "border-rose-400 bg-rose-50 text-rose-950 dark:bg-rose-500/15 dark:text-rose-50",
        result === "won" && "border-emerald-300 bg-emerald-50/70 text-emerald-950 dark:border-emerald-400/40 dark:bg-emerald-500/10 dark:text-emerald-50",
        !selected && !result && "bg-background hover:border-orange-300",
        locked && !selected && !result && "cursor-default opacity-80",
        !locked && "active:scale-[0.98]"
      )}
    >
      <TeamLogo
        name={team.name}
        shortName={team.short_name}
        logoUrl={team.logo_url}
        federationTeamId={team.federation_team_id}
        size="md"
      />
      <span className="line-clamp-2 text-sm font-bold leading-tight">{team.name}</span>
      {mark ? (
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
            result === "hit" && "bg-emerald-600 text-white",
            result === "miss" && "bg-rose-600 text-white",
            result === "won" && "bg-emerald-600/15 text-emerald-800 dark:bg-emerald-400/20 dark:text-emerald-50",
            !result && "bg-orange-500 text-white"
          )}
        >
          {result === "hit" ? <Check className="h-3 w-3" /> : null}
          {result === "miss" ? <X className="h-3 w-3" /> : null}
          {mark}
        </span>
      ) : (
        <span className="text-[10px] font-medium text-muted-foreground">
          {locked ? "Cerrada" : "Elegir"}
        </span>
      )}
    </button>
  );
}
