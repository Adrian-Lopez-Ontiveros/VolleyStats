"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Undo2 } from "lucide-react";
import { toast } from "sonner";
import { addSubstitution, recordPoint, setMatchLibero, undoPoint } from "@/lib/actions/matches";
import { LiveSetLineupPanel } from "@/components/matches/live-set-lineup-panel";
import { LiveStatPad } from "@/components/matches/live-stat-pad";
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
import { rallyPadState } from "@/lib/live-rally";
import { inferNextRotations, inferNextServer } from "@/lib/volleyball-stats";
import { computeMatchState, resolveScoringTeam, setsToWinOf } from "@/lib/volleyball";
import { cn, formatJersey, initials } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { PointHistory } from "@/components/matches/point-history";
import { Scoreboard } from "@/components/matches/scoreboard";
import { VolleyballCourt } from "@/components/matches/volleyball-court";
import { TeamLogo } from "@/components/teams/team-logo";
import { isLocalEventId, useLiveMatchEvents } from "@/components/matches/use-live-match-events";
import {
  LIBERO_KIND_LABEL,
  applyPhaseLibero,
  currentCourtSlots,
  currentLiberoPlayers,
  liberoKindForPhase,
  lineupHasCourtPositions,
  type CourtOccupant,
  type CourtSlots,
} from "@/lib/court";
import type {
  LiberoKind,
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

type ActionGroup = "punto" | "ataque" | "saque" | "bloqueo" | "recepcion" | "defensa";

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
    id: "bloqueo",
    label: "Bloqueo",
    types: ["block", "block_continuation", "block_touch"],
  },
  {
    id: "recepcion",
    label: "Recepción",
    types: ["reception_good", "reception_medium", "reception_bad", "reception_error"],
  },
  {
    id: "defensa",
    label: "Defensa",
    types: ["defense_good", "defense_medium", "defense_bad", "defense_error"],
  },
];

function orderedPadPlayers(slots: CourtSlots, onCourt: Player[]): Player[] {
  const byId = new Map(onCourt.map((player) => [player.id, player]));
  const ordered: Player[] = [];
  const used = new Set<string>();
  for (const position of [4, 3, 2, 5, 6, 1] as const) {
    const occupant = slots[position];
    const full = occupant ? byId.get(occupant.id) : undefined;
    if (full) {
      ordered.push(full);
      used.add(full.id);
    }
  }
  for (const player of onCourt) {
    if (!used.has(player.id)) ordered.push(player);
  }
  return ordered;
}

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
  const queued = useSyncExternalStore(subscribeQueue, readQueue, readQueue);
  const pendingForMatch = useMemo(
    () => queued.filter((item) => item.matchId === match.id),
    [queued, match.id]
  );
  const {
    events: liveEvents,
    substitutions: liveSubstitutions,
    lineup: liveLineup,
    addOptimistic,
    confirmOptimistic,
    removeOptimistic,
    removeLastEvent,
    pullEvents,
  } = useLiveMatchEvents({
    matchId: match.id,
    initialEvents: events,
    initialSubstitutions: substitutions,
    initialLineup: lineup,
    players: [...homePlayers, ...awayPlayers],
  });
  const mergedEvents = useMemo(() => {
    const extras: MatchEventWithPlayer[] = pendingForMatch
      .filter(
        (item) =>
          !liveEvents.some(
            (event) => event.id === item.id || event.client_id === item.id
          )
      )
      .map((item) => ({
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
        client_id: item.id,
        created_by: null,
        created_at: item.createdAt,
        player: item.player,
      }));
    return [...liveEvents, ...extras].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  }, [liveEvents, pendingForMatch, match.home_team_id, match.away_team_id]);
  const displayMatch = useMemo(() => {
    const computed = computeMatchState(
      mergedEvents,
      match.home_team_id,
      match.status,
      setsToWinOf(match)
    );
    return {
      ...match,
      home_sets: computed.homeSets,
      away_sets: computed.awaySets,
      current_set: computed.currentSet,
      home_points: computed.homePoints,
      away_points: computed.awayPoints,
      set_scores: computed.setScores,
      status:
        computed.status === "finished"
          ? ("finished" as const)
          : mergedEvents.some((event) => event.scoring_team_id)
            ? ("live" as const)
            : match.status,
    };
  }, [mergedEvents, match]);
  const [target, setTarget] = useState<PendingTarget | null>(null);
  const [swapTeamId, setSwapTeamId] = useState<string | null>(null);
  const [playerOutId, setPlayerOutId] = useState("");
  const [playerInId, setPlayerInId] = useState("");
  const [liberoEdit, setLiberoEdit] = useState<{ teamId: string; kind: LiberoKind } | null>(null);
  const [actionGroup, setActionGroup] = useState<ActionGroup>("punto");
  const [servingOverride, setServingOverride] = useState<string | null>(null);
  const [homeRotationOverride, setHomeRotationOverride] = useState<number | null>(null);
  const [awayRotationOverride, setAwayRotationOverride] = useState<number | null>(null);
  const [padSide, setPadSide] = useState<"home" | "away">("home");
  const [lineupTeams, setLineupTeams] = useState<string[]>([]);
  const promptedSetRef = useRef(match.current_set);
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
  const homeServing = servingTeamId === match.home_team_id;
  const awayServing = servingTeamId === match.away_team_id;
  const homeRotation = homeRotationOverride ?? inferredRotations.home;
  const awayRotation = awayRotationOverride ?? inferredRotations.away;

  useEffect(() => {
    setServingOverride(null);
    setHomeRotationOverride(null);
    setAwayRotationOverride(null);
  }, [mergedEvents.length, displayMatch.current_set, displayMatch.home_points, displayMatch.away_points]);
  const homeHasCourt = useMemo(
    () => lineupHasCourtPositions(liveLineup, match.home_team_id),
    [liveLineup, match.home_team_id]
  );
  const awayHasCourt = useMemo(
    () => lineupHasCourtPositions(liveLineup, match.away_team_id),
    [liveLineup, match.away_team_id]
  );
  const homeCourtSlots = useMemo(
    () =>
      currentCourtSlots(
        liveLineup,
        liveSubstitutions,
        homePlayers,
        homeRotation,
        match.home_team_id,
        displayMatch.current_set
      ),
    [liveLineup, liveSubstitutions, homePlayers, homeRotation, match.home_team_id, displayMatch.current_set]
  );
  const awayCourtSlots = useMemo(
    () =>
      currentCourtSlots(
        liveLineup,
        liveSubstitutions,
        awayPlayers,
        awayRotation,
        match.away_team_id,
        displayMatch.current_set
      ),
    [liveLineup, liveSubstitutions, awayPlayers, awayRotation, match.away_team_id, displayMatch.current_set]
  );
  const homeLiberos = useMemo(
    () =>
      currentLiberoPlayers(
        liveLineup,
        liveSubstitutions,
        homePlayers,
        match.home_team_id,
        displayMatch.current_set
      ),
    [liveLineup, liveSubstitutions, homePlayers, match.home_team_id, displayMatch.current_set]
  );
  const awayLiberos = useMemo(
    () =>
      currentLiberoPlayers(
        liveLineup,
        liveSubstitutions,
        awayPlayers,
        match.away_team_id,
        displayMatch.current_set
      ),
    [liveLineup, liveSubstitutions, awayPlayers, match.away_team_id, displayMatch.current_set]
  );
  const homeLiberoKind = liberoKindForPhase(
    homeServing,
    homeLiberos.reception?.id ?? null,
    homeLiberos.defense?.id ?? null
  );
  const awayLiberoKind = liberoKindForPhase(
    awayServing,
    awayLiberos.reception?.id ?? null,
    awayLiberos.defense?.id ?? null
  );
  const homeOnCourtIds = useMemo(
    () =>
      applyPhaseLibero(
        currentOnCourtIds(liveLineup, liveSubstitutions, match.home_team_id, displayMatch.current_set),
        homeCourtSlots,
        homeLiberos.reception?.id ?? null,
        homeLiberos.defense?.id ?? null,
        homeServing
      ),
    [
      liveLineup,
      liveSubstitutions,
      match.home_team_id,
      displayMatch.current_set,
      homeCourtSlots,
      homeLiberos.reception?.id,
      homeLiberos.defense?.id,
      homeServing,
    ]
  );
  const awayOnCourtIds = useMemo(
    () =>
      applyPhaseLibero(
        currentOnCourtIds(liveLineup, liveSubstitutions, match.away_team_id, displayMatch.current_set),
        awayCourtSlots,
        awayLiberos.reception?.id ?? null,
        awayLiberos.defense?.id ?? null,
        awayServing
      ),
    [
      liveLineup,
      liveSubstitutions,
      match.away_team_id,
      displayMatch.current_set,
      awayCourtSlots,
      awayLiberos.reception?.id,
      awayLiberos.defense?.id,
      awayServing,
    ]
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

  const flushingRef = useRef(false);
  const confirmRef = useRef(confirmOptimistic);
  const removeOptimisticRef = useRef(removeOptimistic);
  confirmRef.current = confirmOptimistic;
  removeOptimisticRef.current = removeOptimistic;

  const flushQueue = useCallback(async () => {
    if (flushingRef.current) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    flushingRef.current = true;
    try {
      while (true) {
        const item = queueForMatch(match.id)[0];
        if (!item) break;
        try {
          const result = await recordPoint({
            matchId: item.matchId,
            actingTeamId: item.actingTeamId,
            playerId: item.playerId,
            pointType: item.pointType,
            servingTeamId: item.servingTeamId,
            homeRotation: item.homeRotation,
            awayRotation: item.awayRotation,
            setNumber: item.setNumber,
            clientId: item.id,
            liveFast: true,
          });
          if (result.error) {
            if (isNetworkError(result.error)) break;
            toast.error(result.error);
            removeQueued(item.id);
            removeOptimisticRef.current(item.id);
            continue;
          }
          removeQueued(item.id);
          if ("event" in result && result.event && "id" in result.event) {
            confirmRef.current(item.id, {
              ...(result.event as MatchEventWithPlayer),
              player: item.player,
            });
          }
        } catch (error) {
          if (isNetworkError(error)) break;
          toast.error("No se pudo sincronizar una acción pendiente.");
          removeQueued(item.id);
          removeOptimisticRef.current(item.id);
        }
      }
    } finally {
      flushingRef.current = false;
    }
  }, [match.id]);

  useEffect(() => {
    const onOnline = () => {
      void flushQueue();
    };
    window.addEventListener("online", onOnline);
    void flushQueue();
    return () => {
      window.removeEventListener("online", onOnline);
    };
  }, [flushQueue]);

  const lineupTeamQueue = useCallback(() => {
    const clubId = match.home_team.is_club_team
      ? match.home_team_id
      : match.away_team.is_club_team
        ? match.away_team_id
        : null;
    const ids: string[] = [];
    const add = (teamId: string, roster: Player[]) => {
      if (roster.length > 0 && !ids.includes(teamId)) ids.push(teamId);
    };
    if (clubId === match.home_team_id) add(match.home_team_id, homePlayers);
    else if (clubId === match.away_team_id) add(match.away_team_id, awayPlayers);
    add(match.home_team_id, homePlayers);
    add(match.away_team_id, awayPlayers);
    return ids;
  }, [
    match.home_team.is_club_team,
    match.away_team.is_club_team,
    match.home_team_id,
    match.away_team_id,
    homePlayers,
    awayPlayers,
  ]);

  useEffect(() => {
    if (finished) {
      setLineupTeams([]);
      promptedSetRef.current = displayMatch.current_set;
      return;
    }
    if (displayMatch.current_set > promptedSetRef.current) {
      setLineupTeams(lineupTeamQueue());
    } else if (displayMatch.current_set < promptedSetRef.current) {
      setLineupTeams([]);
    }
    promptedSetRef.current = displayMatch.current_set;
  }, [displayMatch.current_set, finished, lineupTeamQueue]);

  const openTeam = useCallback(
    (teamId: string, teamName: string, player?: Player) => {
      if (finished) return;
      setActionGroup("punto");
      setTarget({ teamId, teamName, player });
    },
    [finished]
  );

  function recordAction(
    actingTeamId: string,
    pointType: PointType,
    player?: Pick<Player, "id" | "full_name" | "jersey_number"> | null
  ) {
    const queuedItem: QueuedPoint = {
      id: `local-${newQueueId()}`,
      matchId: match.id,
      createdAt: new Date().toISOString(),
      actingTeamId,
      playerId: player?.id ?? null,
      pointType,
      servingTeamId,
      homeRotation,
      awayRotation,
      setNumber: displayMatch.current_set,
      player: player
        ? {
            id: player.id,
            full_name: player.full_name,
            jersey_number: player.jersey_number,
          }
        : null,
    };
    const optimistic: MatchEventWithPlayer = {
      id: queuedItem.id,
      match_id: queuedItem.matchId,
      set_number: queuedItem.setNumber,
      player_id: queuedItem.playerId,
      acting_team_id: queuedItem.actingTeamId,
      scoring_team_id: resolveScoringTeam(
        queuedItem.actingTeamId,
        match.home_team_id,
        match.away_team_id,
        queuedItem.pointType
      ),
      serving_team_id: queuedItem.servingTeamId,
      home_rotation: queuedItem.homeRotation,
      away_rotation: queuedItem.awayRotation,
      point_type: queuedItem.pointType,
      client_id: queuedItem.id,
      created_by: null,
      created_at: queuedItem.createdAt,
      player: queuedItem.player,
    };
    setTarget(null);
    addOptimistic(optimistic);
    enqueuePoint(queuedItem);
    void flushQueue();
  }

  function submitPoint(pointType: PointType) {
    if (!target) return;
    recordAction(target.teamId, pointType, target.player ?? null);
  }

  function onUndo() {
    const last = mergedEvents[mergedEvents.length - 1];
    if (!last) return;
    removeOptimistic(last.id);
    if (last.client_id) removeOptimistic(last.client_id);
    const queuedId = pendingForMatch.find(
      (item) => item.id === last.id || item.id === last.client_id
    )?.id;
    if (queuedId) {
      removeQueued(queuedId);
      return;
    }
    if (isLocalEventId(last.id)) return;
    startTransition(async () => {
      const result = await undoPoint(match.id, last.id);
      if (result.error) {
        addOptimistic(last);
        toast.error(result.error);
      }
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
      void pullEvents();
      router.refresh();
    });
  }

  function submitLibero(playerId: string | null) {
    if (!liberoEdit) return;
    startTransition(async () => {
      const result = await setMatchLibero(match.id, liberoEdit.teamId, liberoEdit.kind, playerId);
      if ("error" in result && result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(
        playerId
          ? `Líbero de ${LIBERO_KIND_LABEL[liberoEdit.kind].toLowerCase()} actualizado`
          : "Líbero quitado"
      );
      setLiberoEdit(null);
      void pullEvents();
      router.refresh();
    });
  }

  const swapOnCourt = swapTeamId === match.home_team_id ? homeOnCourt : awayOnCourt;
  const swapBench = swapTeamId === match.home_team_id ? homeBench : awayBench;
  const liberoTeamPlayers =
    liberoEdit?.teamId === match.home_team_id
      ? homePlayers
      : liberoEdit?.teamId === match.away_team_id
        ? awayPlayers
        : [];
  const liberoOnCourtIds =
    liberoEdit?.teamId === match.home_team_id
      ? homeOnCourtIds
      : liberoEdit?.teamId === match.away_team_id
        ? awayOnCourtIds
        : null;
  const currentLiberoId =
    liberoEdit?.kind === "defense"
      ? (liberoEdit.teamId === match.home_team_id ? homeLiberos.defense : awayLiberos.defense)?.id ?? ""
      : (liberoEdit?.teamId === match.home_team_id ? homeLiberos.reception : awayLiberos.reception)?.id ?? "";
  const padHomePlayers = orderedPadPlayers(
    homeCourtSlots,
    homeOnCourt.length > 0 ? homeOnCourt : homeOnCourtIds ? [] : homePlayers
  );
  const padAwayPlayers = orderedPadPlayers(
    awayCourtSlots,
    awayOnCourt.length > 0 ? awayOnCourt : awayOnCourtIds ? [] : awayPlayers
  );
  const homeRally = useMemo(
    () => rallyPadState(mergedEvents, displayMatch.current_set, match.home_team_id, homeServing),
    [mergedEvents, displayMatch.current_set, match.home_team_id, homeServing]
  );
  const awayRally = useMemo(
    () => rallyPadState(mergedEvents, displayMatch.current_set, match.away_team_id, awayServing),
    [mergedEvents, displayMatch.current_set, match.away_team_id, awayServing]
  );
  const padRally = padSide === "home" ? homeRally : awayRally;
  const padServerPlayerId =
    padSide === "home"
      ? homeServing
        ? homeCourtSlots[1]?.id ?? null
        : null
      : awayServing
        ? awayCourtSlots[1]?.id ?? null
        : null;
  const lineupTeamId = lineupTeams[0] ?? null;
  const lineupTeam =
    lineupTeamId === match.home_team_id
      ? match.home_team
      : lineupTeamId === match.away_team_id
        ? match.away_team
        : null;
  const lineupPlayers = lineupTeamId === match.home_team_id ? homePlayers : awayPlayers;
  const lineupEntries = liveLineup.filter((entry) => entry.team_id === lineupTeamId);

  return (
    <div className="space-y-4">
      <Scoreboard match={displayMatch} />
      {pendingForMatch.length > 0 ? (
        <p className="rounded-xl bg-amber-50 px-3 py-2 text-center text-xs font-medium text-amber-900">
          {pendingForMatch.length === 1
            ? "1 acción guardada aquí. Se está subiendo para el resto."
            : `${pendingForMatch.length} acciones guardadas aquí. Se están subiendo para el resto.`}
        </p>
      ) : null}

      {!finished ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl border bg-card px-3 py-2">
          <span className="text-xs font-medium text-muted-foreground">Saca</span>
          <button
            type="button"
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
            disabled={false}
            onChange={setHomeRotationOverride}
          />
          <RotationPicker
            label={match.away_team.short_name || "Visitante"}
            value={awayRotation}
            disabled={false}
            onChange={setAwayRotationOverride}
          />
        </div>
      ) : null}

      {finished ? (
        <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-center text-sm font-medium text-emerald-800">
          Partido finalizado. El marcador ya no admite más puntos.
        </p>
      ) : lineupTeam && lineupTeamId ? (
        <LiveSetLineupPanel
          matchId={match.id}
          setNumber={displayMatch.current_set}
          teamId={lineupTeamId}
          teamName={lineupTeam.name}
          players={lineupPlayers}
          lineup={lineupEntries}
          onDone={() => {
            setLineupTeams((current) => current.slice(1));
            void pullEvents();
          }}
          onSkip={() => setLineupTeams((current) => current.slice(1))}
        />
      ) : (
        <>
          <div className="flex items-center justify-between gap-2">
            <div className="grid flex-1 grid-cols-2 gap-1 rounded-xl bg-secondary p-1">
              <button
                type="button"
                onClick={() => setPadSide("home")}
                className={cn(
                  "rounded-lg px-2 py-1.5 text-xs font-semibold",
                  padSide === "home" ? "bg-card shadow-sm" : "text-muted-foreground"
                )}
              >
                {match.home_team.short_name || "Local"}
              </button>
              <button
                type="button"
                onClick={() => setPadSide("away")}
                className={cn(
                  "rounded-lg px-2 py-1.5 text-xs font-semibold",
                  padSide === "away" ? "bg-card shadow-sm" : "text-muted-foreground"
                )}
              >
                {match.away_team.short_name || "Visitante"}
              </button>
            </div>
            {homePlayers.length + awayPlayers.length > 0 ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setLineupTeams(lineupTeamQueue())}
              >
                Titulares
              </Button>
            ) : null}
          </div>
          <LiveStatPad
            teamName={padSide === "home" ? match.home_team.name : match.away_team.name}
            serving={padSide === "home" ? homeServing : awayServing}
            players={padSide === "home" ? padHomePlayers : padAwayPlayers}
            disabled={finished}
            phase={padRally.phase}
            serveLocked={padRally.serveLocked}
            serverPlayerId={padServerPlayerId}
            onAction={(player, pointType) =>
              recordAction(
                padSide === "home" ? match.home_team_id : match.away_team_id,
                pointType,
                player
              )
            }
          />
          <div className="grid grid-cols-3 gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-11 text-xs"
              onClick={() =>
                recordAction(
                  padSide === "home" ? match.home_team_id : match.away_team_id,
                  "opponent_error"
                )
              }
            >
              Error rival
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11 text-xs"
              onClick={() =>
                recordAction(padSide === "home" ? match.home_team_id : match.away_team_id, "other")
              }
            >
              Otro punto
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11 text-xs"
              onClick={() =>
                recordAction(padSide === "home" ? match.home_team_id : match.away_team_id, "error")
              }
            >
              Error propio
            </Button>
          </div>
        </>
      )}

      {homeHasCourt ? (
        <LiveTeamCourt
          title={match.home_team.name}
          logoUrl={match.home_team.logo_url}
          shortName={match.home_team.short_name}
          federationTeamId={match.home_team.federation_team_id}
          rotation={homeRotation}
          slots={homeCourtSlots}
          liberos={{
            reception: homeLiberos.reception,
            defense: homeLiberos.defense,
            activeKind: homeLiberoKind,
          }}
          serving={homeServing}
          canSubstitute={!finished && homeOnCourtIds !== null && homeBench.length > 0}
          disabled={finished}
          onPick={(player) => {
            const full = homePlayers.find((item) => item.id === player.id);
            if (full) openTeam(match.home_team_id, match.home_team.name, full);
          }}
          onSubstitute={() => {
            setSwapTeamId(match.home_team_id);
            setPlayerOutId("");
            setPlayerInId("");
          }}
          onAssignLibero={(kind) => setLiberoEdit({ teamId: match.home_team_id, kind })}
        />
      ) : (
        <Roster
          title={match.home_team.name}
          logoUrl={match.home_team.logo_url}
          shortName={match.home_team.short_name}
          federationTeamId={match.home_team.federation_team_id}
          players={homeOnCourt}
          hasLineup={homeOnCourtIds !== null}
          canSubstitute={!finished && homeOnCourtIds !== null && homeBench.length > 0}
          disabled={finished}
          onPick={(player) => openTeam(match.home_team_id, match.home_team.name, player)}
          onSubstitute={() => {
            setSwapTeamId(match.home_team_id);
            setPlayerOutId("");
            setPlayerInId("");
          }}
        />
      )}
      {awayHasCourt ? (
        <LiveTeamCourt
          title={match.away_team.name}
          logoUrl={match.away_team.logo_url}
          shortName={match.away_team.short_name}
          federationTeamId={match.away_team.federation_team_id}
          rotation={awayRotation}
          slots={awayCourtSlots}
          liberos={{
            reception: awayLiberos.reception,
            defense: awayLiberos.defense,
            activeKind: awayLiberoKind,
          }}
          serving={awayServing}
          canSubstitute={!finished && awayOnCourtIds !== null && awayBench.length > 0}
          disabled={finished}
          onPick={(player) => {
            const full = awayPlayers.find((item) => item.id === player.id);
            if (full) openTeam(match.away_team_id, match.away_team.name, full);
          }}
          onSubstitute={() => {
            setSwapTeamId(match.away_team_id);
            setPlayerOutId("");
            setPlayerInId("");
          }}
          onAssignLibero={(kind) => setLiberoEdit({ teamId: match.away_team_id, kind })}
        />
      ) : (
        <Roster
          title={match.away_team.name}
          logoUrl={match.away_team.logo_url}
          shortName={match.away_team.short_name}
          federationTeamId={match.away_team.federation_team_id}
          players={awayOnCourt}
          hasLineup={awayOnCourtIds !== null}
          canSubstitute={!finished && awayOnCourtIds !== null && awayBench.length > 0}
          disabled={finished}
          onPick={(player) => openTeam(match.away_team_id, match.away_team.name, player)}
          onSubstitute={() => {
            setSwapTeamId(match.away_team_id);
            setPlayerOutId("");
            setPlayerInId("");
          }}
        />
      )}

      <Button
        variant="outline"
        className="w-full"
        disabled={mergedEvents.length === 0}
        onClick={onUndo}
      >
        <Undo2 className="h-4 w-4" />
        Deshacer última acción
      </Button>

      <PointHistory
        events={[...mergedEvents].reverse()}
        substitutions={liveSubstitutions}
        homeTeamId={match.home_team_id}
        homeTeam={match.home_team}
        awayTeam={match.away_team}
        limit={16}
        playerLinks={false}
      />

      <Sheet
        open={!!liberoEdit}
        onOpenChange={(open) => {
          if (!open) setLiberoEdit(null);
        }}
      >
        <SheetContent>
          <SheetHeader>
            <SheetTitle>
              Líbero de {liberoEdit ? LIBERO_KIND_LABEL[liberoEdit.kind].toLowerCase() : ""}
            </SheetTitle>
            <SheetDescription>
              Elige el mismo jugador para recepción y defensa, o uno distinto. El cambio queda
              registrado en el partido.
            </SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pb-4">
            {currentLiberoId ? (
              <button
                type="button"
                disabled={pending}
                onClick={() => submitLibero(null)}
                className="h-11 w-full rounded-xl border border-dashed text-sm font-semibold text-muted-foreground"
              >
                Quitar este líbero
              </button>
            ) : null}
            {liberoTeamPlayers
              .filter(
                (player) =>
                  player.position === "libero" || player.id === currentLiberoId
              )
              .map((player) => {
              const selected = currentLiberoId === player.id;
              const onCourt = liberoOnCourtIds?.has(player.id) ?? false;
              return (
                <button
                  key={player.id}
                  type="button"
                  disabled={pending}
                  onClick={() => submitLibero(player.id)}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 rounded-2xl border px-3 py-3 text-left",
                    selected ? "border-primary bg-primary text-primary-foreground" : "bg-card"
                  )}
                >
                  <span className="min-w-0">
                    <span className="block font-semibold leading-tight">
                      {formatJersey(player.jersey_number)} {player.full_name}
                    </span>
                    <span
                      className={cn(
                        "block text-xs",
                        selected ? "text-primary-foreground/80" : "text-muted-foreground"
                      )}
                    >
                      {onCourt ? "En pista" : "Banquillo"}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>

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
              Un error de ataque, saque, recepción o defensa suma el punto al rival.
              Continuación, saque dentro, recepción y defensa no cambian el marcador.
            </SheetDescription>
          </SheetHeader>
          <div className="grid grid-cols-3 gap-1 rounded-xl bg-secondary p-1 sm:grid-cols-6">
            {ACTION_GROUPS.map((group) => (
              <button
                key={group.id}
                type="button"
                onClick={() => setActionGroup(group.id)}
                className={cn(
                  "rounded-lg px-0.5 py-1.5 text-[10px] font-semibold sm:text-[11px]",
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

const LiveTeamCourt = memo(function LiveTeamCourt({
  title,
  logoUrl,
  shortName,
  federationTeamId,
  rotation,
  slots,
  liberos,
  serving,
  canSubstitute,
  disabled,
  onPick,
  onSubstitute,
  onAssignLibero,
}: {
  title: string;
  logoUrl?: string | null;
  shortName?: string | null;
  federationTeamId?: string | null;
  rotation: number;
  slots: ReturnType<typeof currentCourtSlots>;
  liberos: {
    reception: CourtOccupant | null;
    defense: CourtOccupant | null;
    activeKind: LiberoKind | null;
  };
  serving: boolean;
  canSubstitute: boolean;
  disabled: boolean;
  onPick: (player: CourtOccupant) => void;
  onSubstitute: () => void;
  onAssignLibero: (kind: LiberoKind) => void;
}) {
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex min-w-0 items-center gap-2 text-sm font-semibold">
          <TeamLogo
            name={title}
            shortName={shortName}
            logoUrl={logoUrl}
            federationTeamId={federationTeamId}
            size="sm"
          />
          <span className="truncate">{title}</span>
        </h3>
        <div className="flex shrink-0 items-center gap-2">
          <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-bold tabular-nums text-muted-foreground">
            R{rotation}
          </span>
          {canSubstitute ? (
            <Button type="button" size="sm" variant="outline" disabled={disabled} onClick={onSubstitute}>
              Cambio
            </Button>
          ) : null}
        </div>
      </div>
      <VolleyballCourt
        slots={slots}
        liberos={liberos}
        serving={serving}
        onPlayerClick={disabled ? undefined : onPick}
        onLiberoClick={disabled ? undefined : onAssignLibero}
      />
    </section>
  );
});

const Roster = memo(function Roster({
  title,
  logoUrl,
  shortName,
  federationTeamId,
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
  federationTeamId?: string | null;
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
          <TeamLogo
            name={title}
            shortName={shortName}
            logoUrl={logoUrl}
            federationTeamId={federationTeamId}
            size="sm"
          />
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
