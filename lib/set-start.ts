import type { SetStart } from "@/lib/volleyball-stats";

/**
 * Saque y rotación inicial elegidos para cada set. Se guardan en este
 * dispositivo hasta que la primera acción del set los registra en el partido.
 */
const KEY = "fuenlastats:set-start:v1";

type Store = Record<string, SetStart>;

function read(): Store {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? (parsed as Store) : {};
  } catch {
    return {};
  }
}

function key(matchId: string, setNumber: number) {
  return `${matchId}:${setNumber}`;
}

export function loadSetStart(matchId: string, setNumber: number): SetStart | null {
  return read()[key(matchId, setNumber)] ?? null;
}

export function saveSetStart(matchId: string, setNumber: number, value: SetStart) {
  if (typeof window === "undefined") return;
  try {
    const store = read();
    store[key(matchId, setNumber)] = { ...store[key(matchId, setNumber)], ...value };
    window.localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    /* almacenamiento lleno o bloqueado: se usa solo en memoria */
  }
}
