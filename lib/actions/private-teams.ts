"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { hasCoachAccess } from "@/lib/constants";
import { privateScheduledAt } from "@/lib/private-teams";
import { createClient } from "@/lib/supabase/server";
import { normalizeStoredPersonName } from "@/lib/utils";
import type { PlayerPosition } from "@/lib/types";
import { playerUpdateSucceeded } from "@/lib/player-write";

export type PrivateActionState = { error?: string; success?: string; matchId?: string };
function text(formData: FormData, name: string) { return String(formData.get(name) ?? "").trim(); }
function fail(error: unknown): PrivateActionState { return { error: error instanceof Error ? error.message : "No se pudo completar la operación." }; }
async function staff() {
  const user = await getSessionUser();
  if (!user || !hasCoachAccess(user.profile.role)) return null;
  return user;
}
async function loadEditableTeam(teamId: string) {
  const supabase = await createClient();
  const { data: team } = await supabase.from("teams").select("*").eq("id", teamId).eq("is_private", true).maybeSingle();
  const user = await staff();
  if (!team || !user) return null;
  const owner = team.owner_id === user.id || user.profile.role === "admin";
  return owner ? { team, owner, leagueId: team.private_league_id as string } : null;
}

export async function createPrivateTeam(_: PrivateActionState, formData: FormData): Promise<PrivateActionState> {
  const user = await staff();
  if (!user) return { error: "Solo los entrenadores pueden crear equipos privados." };
  const parsed = z.object({ name: z.string().trim().min(2).max(100), shortName: z.string().trim().max(12) }).safeParse({ name: text(formData, "name"), shortName: text(formData, "shortName") });
  if (!parsed.success) return { error: "Escribe un nombre de equipo válido (y un nombre corto de hasta 12 caracteres)." };
  const supabase = await createClient();
  // El esquema actual requiere un contenedor por entrenador: se crea de forma interna,
  // sin presentarlo como liga ni mostrar clasificación.
  const { data: league, error: leagueError } = await supabase.from("private_leagues").insert({ name: "Mis equipos", owner_id: user.id }).select("id").single();
  if (leagueError || !league) return fail(leagueError?.message);
  const { error } = await supabase.rpc("create_private_team", { p_league_id: league.id, p_name: parsed.data.name, p_short_name: parsed.data.shortName || null, p_category: null });
  if (error) return fail(error.message);
  revalidatePath("/mis-equipos");
  return { success: "Equipo privado creado. Ya puedes formar su plantilla." };
}

export async function addPrivatePlayer(_: PrivateActionState, formData: FormData): Promise<PrivateActionState> {
  const teamId = text(formData, "teamId");
  const access = await loadEditableTeam(teamId);
  if (!access) return { error: "No tienes permiso para editar esta plantilla privada." };
  const fullName = normalizeStoredPersonName(text(formData, "fullName"));
  const rawJersey = text(formData, "jerseyNumber");
  const jersey = rawJersey === "" ? null : Number(rawJersey);
  const rawPosition = text(formData, "position");
  const positions = new Set(["opuesto", "central", "receptor", "colocador", "libero", "universal"]);
  if (fullName.length < 2 || fullName.length > 100) return { error: "Escribe el nombre y apellidos del jugador o jugadora." };
  if (jersey !== null && (!Number.isInteger(jersey) || jersey < 0 || jersey > 99)) return { error: "El dorsal debe ser un número entero entre 0 y 99." };
  if (rawPosition && !positions.has(rawPosition)) return { error: "La posición elegida no es válida." };
  const supabase = await createClient();
  const { error } = await supabase.from("players").insert({ team_id: teamId, full_name: fullName, jersey_number: jersey, position: (rawPosition || null) as PlayerPosition | null, is_private: true });
  if (error) return fail(error.message);
  revalidatePath(`/mis-equipos/${access.team.id}`);
  return { success: "Jugador añadido a la plantilla privada." };
}

export async function updatePrivatePlayer(_: PrivateActionState, formData: FormData): Promise<PrivateActionState> {
  const playerId = text(formData, "playerId");
  const supabase = await createClient();
  const { data: current } = await supabase.from("players").select("team_id, is_private").eq("id", playerId).eq("is_private", true).maybeSingle();
  if (!current) return { error: "No se ha encontrado ese jugador privado." };
  const access = await loadEditableTeam(current.team_id);
  if (!access) return { error: "No tienes permiso para editar esta plantilla privada." };
  const fullName = normalizeStoredPersonName(text(formData, "fullName"));
  const rawJersey = text(formData, "jerseyNumber");
  const jersey = rawJersey === "" ? null : Number(rawJersey);
  const rawPosition = text(formData, "position");
  const positions = new Set(["opuesto", "central", "receptor", "colocador", "libero", "universal"]);
  if (fullName.length < 2 || fullName.length > 100) return { error: "Escribe un nombre válido." };
  if (jersey !== null && (!Number.isInteger(jersey) || jersey < 0 || jersey > 99)) return { error: "El dorsal debe estar entre 0 y 99." };
  if (rawPosition && !positions.has(rawPosition)) return { error: "La posición no es válida." };
  const position = (rawPosition || null) as PlayerPosition | null;
  const { data: updated, error } = await supabase
    .from("players")
    .update({ full_name: fullName, jersey_number: jersey, position })
    .eq("id", playerId)
    .eq("team_id", current.team_id)
    .eq("is_private", true)
    .select("id, position")
    .maybeSingle();
  if (error) return fail(error.message);
  if (!playerUpdateSucceeded(updated, playerId, position)) {
    return { error: "No se pudo guardar la posición. Comprueba que tienes permiso de edición en este equipo y vuelve a intentarlo." };
  }
  revalidatePath(`/mis-equipos/${access.team.id}`);
  return { success: "Datos de la plantilla actualizados." };
}

export async function createPrivateMatch(_: PrivateActionState, formData: FormData): Promise<PrivateActionState> {
  const leagueId = text(formData, "leagueId");
  const homeTeamId = text(formData, "homeTeamId");
  const opponentName = text(formData, "opponentName");
  if (![leagueId, homeTeamId].every((value) => z.string().uuid().safeParse(value).success)) return { error: "No se pudo identificar tu equipo." };
  if (opponentName.length < 2 || opponentName.length > 100) return { error: "Escribe el nombre del rival (entre 2 y 100 caracteres)." };
  const scheduledAt = privateScheduledAt(formData.get("scheduledAt"));
  if (!scheduledAt) return { error: "Escribe una fecha y hora válidas." };
  const supabase = await createClient();
  const { data: matchId, error } = await supabase.rpc("create_private_match_with_opponent", { p_league_id: leagueId, p_home_team_id: homeTeamId, p_opponent_name: opponentName, p_scheduled_at: scheduledAt });
  if (error) return fail(error.message);
  if (typeof matchId !== "string") return { error: "El partido se creó, pero no se pudo abrir. Vuelve a Mis equipos para encontrarlo." };
  revalidatePath(`/mis-equipos/${homeTeamId}`);
  return { success: "Partido privado creado.", matchId };
}
