"use client";

import type { PointType } from "@/lib/types";

const KEY = "fuenla_action_queue_v1";

export type QueuedPoint = {
  id: string;
  matchId: string;
  createdAt: string;
  actingTeamId: string;
  playerId: string | null;
  pointType: PointType;
  servingTeamId: string | null;
  homeRotation: number | null;
  awayRotation: number | null;
  setNumber: number;
  player: { id: string; full_name: string; jersey_number: number | null } | null;
};

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

export function subscribeQueue(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function readQueue(): QueuedPoint[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as QueuedPoint[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(items: QueuedPoint[]) {
  window.localStorage.setItem(KEY, JSON.stringify(items));
  emit();
}

export function enqueuePoint(item: QueuedPoint) {
  writeQueue([...readQueue(), item]);
}

export function removeQueued(id: string) {
  writeQueue(readQueue().filter((item) => item.id !== id));
}

export function queueForMatch(matchId: string) {
  return readQueue().filter((item) => item.matchId === matchId);
}

export function isNetworkError(error: unknown) {
  if (typeof navigator !== "undefined" && !navigator.onLine) return true;
  const message = error instanceof Error ? error.message : String(error ?? "");
  return (
    error instanceof TypeError ||
    /failed to fetch|networkerror|load failed|fetch/i.test(message)
  );
}

export function newQueueId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `offline-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
