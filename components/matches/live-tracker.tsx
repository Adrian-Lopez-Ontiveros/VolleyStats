"use client";

import { memo, useCallback, useEffect, useMemo, useState, useSyncExternalStore, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Undo2 } from "lucide-react";
import { toast } from "sonner";
import { addSubstitution, recordPoint, undoLastPoint } from "@/lib/actions/matches";
import { POINT_TYPE_META } from "@/lib/constants";
import { currentOnCourtIds, playersOnBench, playersOnCourt } from "@/lib/lineup";
import {
  enqueuePoint,
  isNetworkError,
  newQueueId,
  queueForMatch,
  readQueue,
  removeQueued,
  subscribeQueue,
  type QueuedPoint,
} from "@/lib/offline-queue";
import { inferNextRotations, inferNextServer } from "@/lib/volleyball-stats";
import { computeMatchState, resolveScoringTeam } from "@/lib/volleyball";
import { cn, formatJersey, initials } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { PointHistory } from "@/components/matches/point-history";
import { Scoreboard } from "@/components/matches/scoreboard";
import { TeamLogo } from "@/components/teams/team-logo";
import type {
  MatchEventWithPlayer,
  MatchLineupEntry,
  MatchSubstitution,
  MatchWithTeams,
  Player,
  PointType,
} from "@/lib/types";

type PendingTarget = {
  teamId: string;
  teamName: string;
  player?: Player;
};

type ActionGroup = "punto" | "ataque" | "saque" | "recepcion";

const ACTION_GROUPS: { id: ActionGroup; label: string; types: PointType[] }[] = [
  {
    id: "punto",
    label: "Punto",
    types: ["attack", "block", "ace", "error", "opponent_error", "other"],
  },
  {
    id: "ataque",
    label: "Ataque",
    types: ["attack", "attack_error", "attack_continuation"],
  },
  {
    id: "saque",
    label: "Saque",
    types: ["ace", "serve_in", "serve_error"],
  },
  {
    id: "recepcion",
    label: "Recepción",
    types: ["reception_good", "reception_medium", "reception_bad"],
  },
];

export function LiveTracker({
  match,
  homePlayers,
  awayPlayers,
  events,
  lineup = [],
  substitutions = [],
}: {
  match: MatchWithTeams;
  homePlayers: Player[];
  awayPlayers: Player[];
  events: MatchEventWithPlayer[];
  lineup?: MatchLineupEntry[];
  substitutions?: MatchSubstitution[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const queued = useSyncExternalStore(subscribeQueue, readQueue, () => [] as QueuedPoint[]);
  const pendingForMatch = useMemo(
    () => queued.filter((item) => item.matchId === match.id),
    [queued, match.id]
  );
  const mergedEvents = useMemo(() => {
    const extras: MatchEventWithPlayer[] = pendingForMatch.map((item) => ({
      id: item.id,
      match_id: item.matchId,
      set_number: item.setNumber,
      player_id: item.playerId,
      acting_team_id: item.actingTeamId,
      scoring_team_id: resolveScoringTeam(
        item.actingTeamId,
        match.home_team_id,
        match.away_team_id,
        item.pointType
      ),
      serving_team_id: item.servingTeamId,
      home_rotation: item.homeRotation,
      away_rotation: item.awayRotation,
      point_type: item.pointType,
      created_by: null,
      created_at: item.createdAt,
      player: item.player,
    }));
    return [...events, ...extras].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  }, [events, pendingForMatch, match.home_team_id, match.away_team_id]);
  const displayMatch = useMemo(() => {
    const computed = computeMatchState(mergedEvents, match.home_team_id, match.status);
    return {
      ...match,
      home_sets: computed.homeSets,
      away_sets: computed.awaySets,
      current_set: computed.currentSet,
      home_points: computed.homePoints,
      away_points: computed.awayPoints,
      set_scores: computed.setScores,
      status: computed.status === "finished" ? ("finished" as const) : match.status,
    };
  }, [mergedEvents, match]);
  const [target, setTarget] = useState<PendingTarget | null>(null);
  const [swapTeamId, setSwapTeamId] = useState<string | null>(null);
  const [playerOutId, setPlayerOutId] = useState("");
  const [playerInId, setPlayerInId] = useState("");
  const [actionGroup, setActionGroup] = useState<ActionGroup>("punto");
  const [servingOverride, setServingOverride] = useState<string | null>(null);
  const [homeRotationOverride, setHomeRotationOverride] = useState<number | null>(null);
  const [awayRotationOverride, setAwayRotationOverride] = useState<number | null>(null);
  const finished = displayMatch.status === "finished";
  const inferredServer = useMemo(
    () =>
      inferNextServer(
        mergedEvents,
        displayMatch.home_team_id,
        displayMatch.away_team_id,
        displayMatch.current_set
      ),
    [mergedEvents, displayMatch.home_team_id, displayMatch.away_team_id, displayMatch.current_set]
  );
  const inferredRotations = useMemo(
    () =>
      inferNextRotations(
        mergedEvents,
        displayMatch.home_team_id,
        displayMatch.away_team_id,
        displayMatch.current_set
      ),
    [mergedEvents, displayMatch.home_team_id, displayMatch.away_team_id, displayMatch.current_set]
  );
  const servingTeamId = servingOverride ?? inferredServer;
  const homeRotation = homeRotationOverride ?? inferredRotations.home;
  const awayRotation = awayRotationOverride ?? inferredRotations.away;

  useEffect(() => {
    setServingOverride(null);
    setHomeRotationOverride(null);
    setAwayRotationOverride(null);
  }, [mergedEvents.length, displayMatch.current_set, displayMatch.home_points, displayMatch.away_points]);
  const homeOnCourtIds = useMemo(
    () => currentOnCourtIds(lineup, substitutions, match.home_team_id),
    [lineup, substitutions, match.home_team_id]
  );
  const awayOnCourtIds = useMemo(
    () => currentOnCourtIds(lineup, substitutions, match.away_team_id),
    [lineup, substitutions, match.away_team_id]
  );
  const homeOnCourt = useMemo(
    () =>
      homeOnCourtIds
        ? playersOnCourt(homePlayers, homeOnCourtIds)
        : match.home_team.is_club_team
          ? []
          : homePlayers,
    [homeOnCourtIds, homePlayers, match.home_team.is_club_team]
  );
  const awayOnCourt = useMemo(
    () =>
      awayOnCourtIds
        ? playersOnCourt(awayPlayers, awayOnCourtIds)
        : match.away_team.is_club_team
          ? []
          : awayPlayers,
    [awayOnCourtIds, awayPlayers, match.away_team.is_club_team]
  );
  const homeBench = useMemo(
    () => playersOnBench(homePlayers, homeOnCourtIds),
    [homePlayers, homeOnCourtIds]
  );
  const awayBench = useMemo(
    () => playersOnBench(awayPlayers, awayOnCourtIds),
    [awayPlayers, awayOnCourtIds]
  );

  useEffect(() => {
    const supabase = createClient();
    let timer: ReturnType<typeof setTimeout> | null = null;
    const refresh = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), 120);
    };

    const channel = supabase
      .channel(`match-${match.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "matches", filter: `id=eq.${match.id}` },
        refresh
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "match_substitutions", filter: `match_id=eq.${match.id}` },
        refresh
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "match_lineups", filter: `match_id=eq.${match.id}` },
        refresh
      )
      .subscribe();

    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [match.id, router]);

  useEffect(() => {
    let cancelled = false;

    async function flushQueue() {
      if (typeof navigator !== "undefined" && !navigator.onLine) return;
      const items = queueForMatch(match.id);
      if (items.length === 0) return;
      for (const item of items) {
        try {
          const result = await recordPoint({
            matchId: item.matchId,
            actingTeamId: item.actingTeamId,
            playerId: item.playerId,
            pointType: item.pointType,
            servingTeamId: item.servingTeamId,
            homeRotation: item.homeRotation,
            awayRotation: item.awayRotation,
          });
          if (result.error) {
            if (!isNetworkError(result.error)) {
              toast.error(result.error);
              removeQueued(item.id);
            }
            break;
          }
          removeQueued(item.id);
        } catch (error) {
          if (!isNetworkError(error)) {
            toast.error("No se pudo sincronizar una acción pendiente.");
            removeQueued(item.id);
          }
          break;
        }
      }
      if (!cancelled) router.refresh();
    }

    const onOnline = () => {
      void flushQueue();
    };
    window.addEventListener("online", onOnline);
    void flushQueue();
    return () => {
      cancelled = true;
      window.removeEventListener("online", onOnline);
    };
  }, [match.id, router]);

  const openTeam = useCallback(
    (teamId: string, teamName: string, player?: Player) => {
      if (finished) return;
      setActionGroup("punto");
      setTarget({ teamId, teamName, player });
    },
    [finished]
  );

  function submitPoint(pointType: PointType) {
    if (!target) return;
    const queuedItem: QueuedPoint = {
      id: newQueueId(),
      matchId: match.id,
      createdAt: new Date().toISOString(),
      actingTeamId: target.teamId,
      playerId: target.player?.id ?? null,
      pointType,
      servingTeamId,
      homeRotation,
      awayRotation,
      setNumber: displayMatch.current_set,
      player: target.player
        ? {
            id: target.player.id,
            full_name: target.player.full_name,
            jersey_number: target.player.jersey_number,
          }
        : null,
    };
    setTarget(null);

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      enqueuePoint(queuedItem);
      toast.message("Guardado sin conexión. Se enviará al recuperar internet.");
      return;
    }

    startTransition(async () => {
      try {
        const result = await recordPoint({
          matchId: match.id,
          actingTeamId: queuedItem.actingTeamId,
          playerId: queuedItem.playerId,
          pointType: queuedItem.pointType,
          servingTeamId: queuedItem.servingTeamId,
          homeRotation: queuedItem.homeRotation,
          awayRotation: queuedItem.awayRotation,
        });
        if (result.error) {
          if (isNetworkError(result.error)) {
            enqueuePoint(queuedItem);
            toast.message("Sin conexión. La acción queda pendiente.");
            return;
          }
          toast.error(result.error);
          return;
        }
        router.refresh();
      } catch (error) {
        if (isNetworkError(error)) {
          enqueuePoint(queuedItem);
          toast.message("Sin conexión. La acción queda pendiente.");
          return;
        }
        toast.error("No se pudo registrar la acción.");
      }
    });
  }

  function onUndo() {
    const lastQueued = [...pendingForMatch].pop();
    if (lastQueued) {
      removeQueued(lastQueued.id);
      toast.success("Acción local deshecha.");
      return;
    }
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      toast.error("Necesitas conexión para deshacer un punto ya guardado.");
      return;
    }
    startTransition(async () => {
      const result = await undoLastPoint(match.id);
      if (result.error) toast.error(result.error);
      else router.refresh();
    });
  }

  function submitSubstitution() {
    if (!swapTeamId || !playerOutId || !playerInId) return;
    const formData = new FormData();
    formData.set("playerOutId", playerOutId);
    formData.set("playerInId", playerInId);
    formData.set("setNumber", String(match.current_set));
    startTransition(async () => {
      const result = await addSubstitution(match.id, formData);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Cambio hecho");
      setSwapTeamId(null);
      setPlayerOutId("");
      setPlayerInId("");
      router.refresh();
    });
  }

  const swapOnCourt = swapTeamId === match.home_team_id ? homeOnCourt : awayOnCourt;
  const swapBench = swapTeamId === match.home_team_id ? homeBench : awayBench;

  return (
    <div className="space-y-4">
      <Scoreboard match={displayMatch} />

      {!finished ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl border bg-card px-3 py-2">
          <span className="text-xs font-medium text-muted-foreground">Saca</span>
          <button
            type="button"
            disabled={pending}
            onClick={() => setServingOverride(match.home_team_id)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-semibold",
              servingTeamId === match.home_team_id
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground"
            )}
          >
            {match.home_team.short_name || "Local"}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => setServingOverride(match.away_team_id)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-semibold",
              servingTeamId === match.away_team_id
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground"
            )}
          >
            {match.away_team.short_name || "Visitante"}
          </button>
        </div>
      ) : null}

      {!finished ? (
        <div className="space-y-2 rounded-2xl border bg-card px-3 py-3">
          <p className="text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Rotación · se avanza sola al ganar el saque
          </p>
          <RotationPicker
            label={match.home_team.short_name || "Local"}
            value={homeRotation}
            disabled={pending}
            onChange={setHomeRotationOverride}
          />
          <RotationPicker
            label={match.away_team.short_name || "Visitante"}
            value={awayRotation}
            disabled={pending}
            onChange={setAwayRotationOverride}
          />
        </div>
      ) : null}

      {finished ? (
        <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-center text-sm font-medium text-emerald-800">
          Partido finalizado. El marcador ya no admite más puntos.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <Button
            size="xl"
            className="h-20 bg-sky-700 text-white hover:bg-sky-800"
            disabled={pending}
            onClick={() => openTeam(match.home_team_id, match.home_team.name)}
          >
            Punto {match.home_team.short_name || "local"}
          </Button>
          <Button
            size="xl"
            variant="accent"
            className="h-20"
            disabled={pending}
            onClick={() => openTeam(match.away_team_id, match.away_team.name)}
          >
            Punto {match.away_team.short_name || "visitante"}
          </Button>
        </div>
      )}

      <Roster
        title={match.home_team.name}
        logoUrl={match.home_team.logo_url}
        shortName={match.home_team.short_name}
        players={homeOnCourt}
        hasLineup={homeOnCourtIds !== null}
        canSubstitute={!finished && homeOnCourtIds !== null && homeBench.length > 0}
        disabled={finished || pending}
        onPick={(player) => openTeam(match.home_team_id, match.home_team.name, player)}
        onSubstitute={() => {
          setSwapTeamId(match.home_team_id);
          setPlayerOutId("");
          setPlayerInId("");
        }}
      />
      <Roster
        title={match.away_team.name}
        logoUrl={match.away_team.logo_url}
        shortName={match.away_team.short_name}
        players={awayOnCourt}
        hasLineup={awayOnCourtIds !== null}
        canSubstitute={!finished && awayOnCourtIds !== null && awayBench.length > 0}
        disabled={finished || pending}
        onPick={(player) => openTeam(match.away_team_id, match.away_team.name, player)}
        onSubstitute={() => {
          setSwapTeamId(match.away_team_id);
          setPlayerOutId("");
          setPlayerInId("");
        }}
      />

      <Button
        variant="outline"
        className="w-full"
        disabled={pending || mergedEvents.length === 0}
        onClick={onUndo}
      >
        <Undo2 className="h-4 w-4" />
        Deshacer última acción
      </Button>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Historial del partido</h3>
        <PointHistory
          events={[...mergedEvents].reverse()}
          substitutions={substitutions}
          homeTeamId={match.home_team_id}
          limit={16}
          playerLinks={false}
        />
      </section>

      <Sheet
        open={!!swapTeamId}
        onOpenChange={(open) => {
          if (!open) setSwapTeamId(null);
        }}
      >
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Cambio</SheetTitle>
            <SheetDescription>
              El que sale deja de poder anotar. El que entra pasa a estar en pista.
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-3">
            <label className="block space-y-1.5 text-sm font-medium">
              Sale
              <select
                value={playerOutId}
                onChange={(event) => setPlayerOutId(event.target.value)}
                className="flex h-11 w-full rounded-xl border border-input bg-background px-3 text-sm font-normal"
              >
                <option value="">Jugador en pista</option>
                {swapOnCourt.map((player) => (
                  <option key={player.id} value={player.id}>
                    {formatJersey(player.jersey_number)} {player.full_name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1.5 text-sm font-medium">
              Entra
              <select
                value={playerInId}
                onChange={(event) => setPlayerInId(event.target.value)}
                className="flex h-11 w-full rounded-xl border border-input bg-background px-3 text-sm font-normal"
              >
                <option value="">Jugador del banquillo</option>
                {swapBench.map((player) => (
                  <option key={player.id} value={player.id}>
                    {formatJersey(player.jersey_number)} {player.full_name}
                  </option>
                ))}
              </select>
            </label>
            <Button
              variant="accent"
              className="w-full"
              disabled={pending || !playerOutId || !playerInId}
              onClick={submitSubstitution}
            >
              Confirmar cambio
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={!!target} onOpenChange={(open) => !open && setTarget(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>
              {target?.player
                ? `${target.player.full_name} ${formatJersey(target.player.jersey_number)}`
                : `Punto de ${target?.teamName ?? ""}`}
            </SheetTitle>
            <SheetDescription>
              Un error de ataque o saque suma el punto al rival. Continuación, saque
              dentro y recepción no cambian el marcador.
            </SheetDescription>
          </SheetHeader>
          <div className="grid grid-cols-4 gap-1 rounded-xl bg-secondary p-1">
            {ACTION_GROUPS.map((group) => (
              <button
                key={group.id}
                type="button"
                onClick={() => setActionGroup(group.id)}
                className={cn(
                  "rounded-lg px-1 py-1.5 text-[11px] font-semibold",
                  actionGroup === group.id
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground"
                )}
              >
                {group.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {(ACTION_GROUPS.find((group) => group.id === actionGroup)?.types ?? []).map((type) => {
              const meta = POINT_TYPE_META[type];
              return (
                <button
                  key={type}
                  type="button"
                  disabled={pending}
                  onClick={() => submitPoint(type)}
                  className={cn(
                    "flex h-16 items-center justify-center rounded-2xl border-2 px-3 text-center text-sm font-bold shadow-sm transition-colors disabled:opacity-50",
                    meta.buttonClassName
                  )}
                >
                  {meta.label}
                </button>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function RotationPicker({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: number;
  disabled: boolean;
  onChange: (rotation: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-16 shrink-0 truncate text-[11px] font-medium text-muted-foreground">
        {label}
      </span>
      <div className="grid flex-1 grid-cols-6 gap-1">
        {[1, 2, 3, 4, 5, 6].map((rotation) => (
          <button
            key={rotation}
            type="button"
            disabled={disabled}
            onClick={() => onChange(rotation)}
            className={cn(
              "h-8 rounded-lg text-xs font-bold tabular-nums",
              value === rotation
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground"
            )}
          >
            {rotation}
          </button>
        ))}
      </div>
    </div>
  );
}

const Roster = memo(function Roster({
  title,
  logoUrl,
  shortName,
  players,
  hasLineup,
  canSubstitute,
  disabled,
  onPick,
  onSubstitute,
}: {
  title: string;
  logoUrl?: string | null;
  shortName?: string | null;
  players: Player[];
  hasLineup: boolean;
  canSubstitute: boolean;
  disabled: boolean;
  onPick: (player: Player) => void;
  onSubstitute: () => void;
}) {
  return (
    <section>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="flex min-w-0 items-center gap-2 text-sm font-semibold">
          <TeamLogo name={title} shortName={shortName} logoUrl={logoUrl} size="sm" />
          <span className="truncate">{hasLineup ? `${title} · En pista` : title}</span>
        </h3>
        {canSubstitute ? (
          <Button type="button" size="sm" variant="outline" disabled={disabled} onClick={onSubstitute}>
            Cambio
          </Button>
        ) : null}
      </div>
      {players.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {hasLineup
            ? "Nadie en pista ahora mismo. Revisa la alineación o los cambios."
            : "Define la alineación titular para asignar puntos a jugadores. Puedes anotar el punto al equipo."}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {players.map((player) => (
            <button
              key={player.id}
              type="button"
              disabled={disabled}
              onClick={() => onPick(player)}
              className="flex items-center gap-2 rounded-2xl border bg-card p-2 text-left shadow-sm active:scale-[0.99] disabled:opacity-50"
            >
              <Avatar className="h-10 w-10">
                <AvatarImage src={player.avatar_url ?? undefined} alt={player.full_name} />
                <AvatarFallback>{initials(player.full_name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{player.full_name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatJersey(player.jersey_number)}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
});
