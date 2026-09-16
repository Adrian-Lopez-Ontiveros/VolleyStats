"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MATCH_EVENT_SELECT, MATCH_LINEUP_SELECT, MATCH_SUB_SELECT } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import type { MatchEvent, MatchEventWithPlayer, MatchLineupEntry, MatchSubstitution, Player } from "@/lib/types";

export function isLocalEventId(id: string) {
  return id.startsWith("local-") || id.startsWith("offline-");
}

function byTime(a: { created_at: string }, b: { created_at: string }) {
  return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
}

function withPlayer(
  event: MatchEventWithPlayer,
  playersById: Map<string, Player>
): MatchEventWithPlayer {
  if (event.player || !event.player_id) return { ...event, player: event.player ?? null };
  const player = playersById.get(event.player_id);
  return player
    ? {
        ...event,
        player: {
          id: player.id,
          full_name: player.full_name,
          jersey_number: player.jersey_number,
        },
      }
    : { ...event, player: null };
}

function clientKey(event: Pick<MatchEvent, "id" | "client_id">) {
  return event.client_id || event.id;
}

function adoptServerEvents(current: MatchEventWithPlayer[], incoming: MatchEventWithPlayer[]) {
  const server = incoming.filter((event) => !isLocalEventId(event.id));
  const locals = current.filter((event) => isLocalEventId(event.id));
  const usedLocals = new Set<string>();
  const next = new Map<string, MatchEventWithPlayer>();

  for (const event of current) {
    if (!isLocalEventId(event.id)) next.set(event.id, event);
  }

  for (const event of server) {
    const local = locals.find(
      (item) =>
        !usedLocals.has(item.id) &&
        (item.id === event.client_id || item.client_id === event.client_id || item.id === event.id)
    );
    if (local) {
      usedLocals.add(local.id);
      next.set(event.id, {
        ...event,
        client_id: event.client_id || local.client_id || local.id,
        player: event.player ?? local.player,
      });
      continue;
    }
    next.set(event.id, event);
  }

  for (const local of locals) {
    if (!usedLocals.has(local.id)) next.set(local.id, local);
  }

  return [...next.values()].sort(byTime);
}

export function useLiveMatchEvents({
  matchId,
  initialEvents,
  initialSubstitutions,
  initialLineup = [],
  players,
}: {
  matchId: string;
  initialEvents: MatchEventWithPlayer[];
  initialSubstitutions: MatchSubstitution[];
  initialLineup?: MatchLineupEntry[];
  players: Player[];
}) {
  const [events, setEvents] = useState(initialEvents);
  const [substitutions, setSubstitutions] = useState(initialSubstitutions);
  const [lineup, setLineup] = useState(initialLineup);
  const playersById = useMemo(() => new Map(players.map((player) => [player.id, player])), [players]);
  const playersRef = useRef(playersById);
  playersRef.current = playersById;

  const pullEvents = useCallback(async () => {
    const supabase = createClient();
    const [{ data: eventRows }, { data: subRows }, { data: lineupRows }] = await Promise.all([
      supabase
        .from("match_events")
        .select(MATCH_EVENT_SELECT as "*")
        .eq("match_id", matchId)
        .order("created_at", { ascending: true }),
      supabase
        .from("match_substitutions")
        .select(MATCH_SUB_SELECT as "*")
        .eq("match_id", matchId)
        .order("created_at", { ascending: true }),
      supabase
        .from("match_lineups")
        .select(MATCH_LINEUP_SELECT as "*")
        .eq("match_id", matchId),
    ]);

    if (eventRows) {
      const incoming = (eventRows as MatchEventWithPlayer[]).map((event) =>
        withPlayer(event, playersRef.current)
      );
      setEvents((current) => adoptServerEvents(current, incoming));
    }
    if (subRows) {
      setSubstitutions(subRows as MatchSubstitution[]);
    }
    if (lineupRows) {
      setLineup(lineupRows as MatchLineupEntry[]);
    }
  }, [matchId]);

  useEffect(() => {
    setEvents(initialEvents);
    setSubstitutions(initialSubstitutions);
    setLineup(initialLineup);
  }, [matchId]);

  useEffect(() => {
    void pullEvents();
    const supabase = createClient();
    let timer: ReturnType<typeof setTimeout> | null = null;
    const schedulePull = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        void pullEvents();
      }, 120);
    };

    const channel = supabase
      .channel(`live-match-${matchId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "match_events", filter: `match_id=eq.${matchId}` },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const removedId = (payload.old as { id?: string } | null)?.id;
            if (removedId) {
              setEvents((current) => current.filter((event) => event.id !== removedId));
            }
            return;
          }
          const row = payload.new as MatchEvent | null;
          if (!row?.id) {
            schedulePull();
            return;
          }
          setEvents((current) =>
            adoptServerEvents(current, [
              withPlayer(
                {
                  ...row,
                  player: null,
                },
                playersRef.current
              ),
            ])
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "matches", filter: `id=eq.${matchId}` },
        schedulePull
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "match_substitutions", filter: `match_id=eq.${matchId}` },
        schedulePull
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "match_lineups", filter: `match_id=eq.${matchId}` },
        schedulePull
      )
      .subscribe();

    const onVisible = () => {
      if (document.visibilityState === "visible") void pullEvents();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);

    return () => {
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      supabase.removeChannel(channel);
    };
  }, [matchId, pullEvents]);

  const addOptimistic = useCallback((event: MatchEventWithPlayer) => {
    setEvents((current) => {
      if (current.some((item) => item.id === event.id || clientKey(item) === clientKey(event))) {
        return current;
      }
      return [...current, event].sort(byTime);
    });
  }, []);

  const confirmOptimistic = useCallback((localId: string, event: MatchEventWithPlayer) => {
    setEvents((current) => {
      const resolved = withPlayer(
        { ...event, client_id: event.client_id || localId },
        playersRef.current
      );
      const withoutLocal = current.filter(
        (item) => item.id !== localId && item.id !== resolved.id && item.client_id !== localId
      );
      return [...withoutLocal, resolved].sort(byTime);
    });
  }, []);

  const removeOptimistic = useCallback((localId: string) => {
    setEvents((current) =>
      current.filter((event) => event.id !== localId && event.client_id !== localId)
    );
  }, []);

  const removeLastEvent = useCallback(() => {
    let removed: MatchEventWithPlayer | null = null;
    setEvents((current) => {
      if (current.length === 0) return current;
      removed = current[current.length - 1];
      return current.slice(0, -1);
    });
    return removed;
  }, []);

  return {
    events,
    substitutions,
    lineup,
    addOptimistic,
    confirmOptimistic,
    removeOptimistic,
    removeLastEvent,
    pullEvents,
  };
}
