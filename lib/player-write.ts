import type { PlayerPosition } from "@/lib/types";

/** Supabase puede devolver cero filas cuando RLS impide una escritura. */
export function playerUpdateSucceeded(
  updated: { id: string; position: PlayerPosition | null } | null,
  playerId: string,
  position: PlayerPosition | null
): boolean {
  return updated?.id === playerId && updated.position === position;
}
