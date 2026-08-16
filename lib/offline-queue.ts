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
const EMPTY_QUEUE: QueuedPoint[] = [];

let cachedRaw: string | null | undefined;
let cachedQueue: QueuedPoint[] = EMPTY_QUEUE;

function emit() {
  listeners.forEach((listener) => listener());
}

export function subscribeQueue(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function readQueue(): QueuedPoint[] {
  if (typeof window === "undefined") return EMPTY_QUEUE;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw === cachedRaw) return cachedQueue;
    cachedRaw = raw;
    const parsed = raw ? (JSON.parse(raw) as QueuedPoint[]) : EMPTY_QUEUE;
    cachedQueue = Array.isArray(parsed) && parsed.length > 0 ? parsed : EMPTY_QUEUE;
    return cachedQueue;
  } catch {
    cachedRaw = undefined;
    cachedQueue = EMPTY_QUEUE;
    return EMPTY_QUEUE;
  }
}

function writeQueue(items: QueuedPoint[]) {
  const next = items.length > 0 ? items : EMPTY_QUEUE;
  const raw = JSON.stringify(next);
  window.localStorage.setItem(KEY, raw);
  cachedRaw = raw;
  cachedQueue = next;
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
