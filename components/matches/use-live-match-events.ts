"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MATCH_EVENT_SELECT, MATCH_SUB_SELECT } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import type { MatchEvent, MatchEventWithPlayer, MatchSubstitution, Player } from "@/lib/types";

function isLocalId(id: string) {
  return id.startsWith("local-") || id.startsWith("offline-");
}

function byTime(a: { created_at: string }, b: { created_at: string }) {
  return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
}

function sameAction(
  left: Pick<MatchEvent, "acting_team_id" | "point_type" | "player_id" | "created_at">,
  right: Pick<MatchEvent, "acting_team_id" | "point_type" | "player_id" | "created_at">
) {
  return (
    left.acting_team_id === right.acting_team_id &&
    left.point_type === right.point_type &&
    (left.player_id ?? null) === (right.player_id ?? null) &&
    Math.abs(new Date(left.created_at).getTime() - new Date(right.created_at).getTime()) < 20000
  );
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

function mergeEvents(incoming: MatchEventWithPlayer[], current: MatchEventWithPlayer[]) {
  const next = new Map<string, MatchEventWithPlayer>();
  for (const event of incoming) next.set(event.id, event);
  for (const event of current) {
    if (isLocalId(event.id)) {
      const confirmed = incoming.some((item) => !isLocalId(item.id) && sameAction(item, event));
      if (!confirmed) next.set(event.id, event);
      continue;
    }
    if (!next.has(event.id)) next.set(event.id, event);
  }
  return [...next.values()].sort(byTime);
}

export function useLiveMatchEvents({
  matchId,
  initialEvents,
  initialSubstitutions,
  players,
}: {
  matchId: string;
  initialEvents: MatchEventWithPlayer[];
  initialSubstitutions: MatchSubstitution[];
  players: Player[];
}) {
  const [events, setEvents] = useState(initialEvents);
  const [substitutions, setSubstitutions] = useState(initialSubstitutions);
  const playersById = useMemo(() => new Map(players.map((player) => [player.id, player])), [players]);
  const playersRef = useRef(playersById);
  playersRef.current = playersById;

  const pullEvents = useCallback(async () => {
    const supabase = createClient();
    const [{ data: eventRows }, { data: subRows }] = await Promise.all([
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
    ]);

    if (eventRows) {
      const incoming = (eventRows as MatchEventWithPlayer[]).map((event) =>
        withPlayer(event, playersRef.current)
      );
      setEvents((current) => mergeEvents(incoming, current));
    }
    if (subRows) {
      setSubstitutions(subRows as MatchSubstitution[]);
    }
  }, [matchId]);

  useEffect(() => {
    setEvents(initialEvents);
    setSubstitutions(initialSubstitutions);
  }, [matchId]);

  useEffect(() => {
    void pullEvents();
    const supabase = createClient();
    let timer: ReturnType<typeof setTimeout> | null = null;
    const schedulePull = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        void pullEvents();
      }, 80);
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
            mergeEvents(
              [
                ...current.filter((event) => event.id !== row.id && !isLocalId(event.id)),
                withPlayer(
                  {
                    ...row,
                    player: null,
                  },
                  playersRef.current
                ),
              ],
              current
            )
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
    const poll = window.setInterval(onVisible, 3000);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);

    return () => {
      if (timer) clearTimeout(timer);
      window.clearInterval(poll);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      supabase.removeChannel(channel);
    };
  }, [matchId, pullEvents]);

  const addOptimistic = useCallback((event: MatchEventWithPlayer) => {
    setEvents((current) => mergeEvents(current, [event]));
  }, []);

  const confirmOptimistic = useCallback((localId: string, event: MatchEventWithPlayer) => {
    setEvents((current) => {
      const withoutLocal = current.filter((item) => item.id !== localId);
      return mergeEvents(withoutLocal, [withPlayer(event, playersRef.current)]);
    });
  }, []);

  const removeOptimistic = useCallback((localId: string) => {
    setEvents((current) => current.filter((event) => event.id !== localId));
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
    addOptimistic,
    confirmOptimistic,
    removeOptimistic,
    removeLastEvent,
    pullEvents,
  };
}
