"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { hasCoachAccess } from "@/lib/constants";
import { privateMatchScore, privateScheduledAt } from "@/lib/private-teams";
import { loadPrivateWorkspace } from "@/lib/private-teams-data";
import { createClient } from "@/lib/supabase/server";
import { normalizeStoredPersonName } from "@/lib/utils";
import type { PlayerPosition } from "@/lib/types";

export type PrivateActionState = { error?: string; success?: string };
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
  if (!team) return null;
  const { data: league } = await supabase.from("private_leagues").select("owner_id").eq("id", team.private_league_id).maybeSingle();
  const user = await getSessionUser();
  if (!user) return null;
  const owner = league?.owner_id === user.id || user.profile.role === "admin";
  const { data: membership } = await supabase.from("team_members").select("role").eq("team_id", teamId).eq("user_id", user.id).eq("accepted", true).maybeSingle();
  return owner || membership?.role === "editor" ? { team, owner, leagueId: team.private_league_id as string } : null;
}

export async function createPrivateLeague(_: PrivateActionState, formData: FormData): Promise<PrivateActionState> {
  const user = await staff();
  if (!user) return { error: "Solo los entrenadores pueden crear una liga privada." };
  const name = text(formData, "name");
  if (name.length < 2 || name.length > 100) return { error: "Escribe un nombre de liga de 2 a 100 caracteres." };
  const supabase = await createClient();
  const { error } = await supabase.from("private_leagues").insert({ name, owner_id: user.id });
  if (error) return fail(error.message);
  revalidatePath("/mis-equipos");
  return { success: "Liga privada creada. Ya puedes añadir tu equipo y los rivales." };
}

export async function createPrivateTeam(_: PrivateActionState, formData: FormData): Promise<PrivateActionState> {
  const user = await staff();
  if (!user) return { error: "Solo los entrenadores pueden crear equipos privados." };
  const leagueId = text(formData, "leagueId");
  const parsed = z.object({ name: z.string().trim().min(2).max(100), shortName: z.string().trim().max(12) }).safeParse({ name: text(formData, "name"), shortName: text(formData, "shortName") });
  if (!parsed.success || !z.string().uuid().safeParse(leagueId).success) return { error: "Escribe un nombre de equipo válido (y un nombre corto de hasta 12 caracteres)." };
  const supabase = await createClient();
  const { data: league } = await supabase.from("private_leagues").select("owner_id").eq("id", leagueId).maybeSingle();
  if (!league || (league.owner_id !== user.id && user.profile.role !== "admin")) return { error: "Solo el propietario de la liga puede añadir equipos." };
  const { error } = await supabase.rpc("create_private_team", { p_league_id: leagueId, p_name: parsed.data.name, p_short_name: parsed.data.shortName || null, p_category: null });
  if (error) return fail(error.message);
  revalidatePath(`/mis-equipos/${leagueId}`);
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
  revalidatePath(`/mis-equipos/${access.leagueId}`);
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
  const { error } = await supabase.from("players").update({ full_name: fullName, jersey_number: jersey, position: (rawPosition || null) as PlayerPosition | null, team_id: current.team_id }).eq("id", playerId).eq("is_private", true);
  if (error) return fail(error.message);
  revalidatePath(`/mis-equipos/${access.leagueId}`);
  return { success: "Datos de la plantilla actualizados." };
}

export async function createPrivateMatch(_: PrivateActionState, formData: FormData): Promise<PrivateActionState> {
  const leagueId = text(formData, "leagueId");
  const homeTeamId = text(formData, "homeTeamId");
  const awayTeamId = text(formData, "awayTeamId");
  if (![leagueId, homeTeamId, awayTeamId].every((value) => z.string().uuid().safeParse(value).success)) return { error: "Elige una liga y dos equipos." };
  if (homeTeamId === awayTeamId) return { error: "El local y el visitante deben ser equipos distintos." };
  const scheduledAt = privateScheduledAt(formData.get("scheduledAt"));
  if (!scheduledAt) return { error: "Escribe una fecha y hora válidas." };
  const workspace = await loadPrivateWorkspace(leagueId);
  const home = workspace.teams.find((team) => team.id === homeTeamId);
  const away = workspace.teams.find((team) => team.id === awayTeamId);
  const canEdit = await Promise.all([homeTeamId, awayTeamId].map(async (id) => Boolean(await loadEditableTeam(id))));
  if (!home || !away || !canEdit.every(Boolean)) return { error: "Necesitas permiso de edición en los dos equipos del partido." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("create_private_match", { p_league_id: leagueId, p_home_team_id: homeTeamId, p_away_team_id: awayTeamId, p_scheduled_at: scheduledAt });
  if (error) return fail(error.message);
  revalidatePath(`/mis-equipos/${leagueId}`);
  return { success: "Partido privado creado. Puedes introducir su resultado cuando termine." };
}

export async function updatePrivateMatchResult(_: PrivateActionState, formData: FormData): Promise<PrivateActionState> {
  const matchId = text(formData, "matchId");
  const supabase = await createClient();
  const { data: match } = await supabase.from("matches").select("*").eq("id", matchId).eq("is_private", true).maybeSingle();
  if (!match) return { error: "Partido privado no encontrado." };
  const homeAccess = await loadEditableTeam(match.home_team_id);
  const awayAccess = await loadEditableTeam(match.away_team_id);
  if (!homeAccess && !awayAccess && !((await staff())?.profile.role === "admin")) return { error: "No tienes permiso para editar este partido." };
  const score = privateMatchScore(formData, match);
  if (score.error || !score.result) return { error: score.error ?? "Resultado no válido." };
  const result = score.result;
  const { error } = await supabase.from("matches").update({ status: "finished", home_sets: result.home_sets, away_sets: result.away_sets, set_scores: score.result.set_scores, current_set: result.current_set, home_points: 0, away_points: 0 }).eq("id", matchId).eq("is_private", true);
  if (error) return fail(error.message);
  revalidatePath(`/mis-equipos/${match.private_league_id}`);
  revalidatePath(`/mis-equipos/partidos/${matchId}`);
  return { success: "Resultado guardado. La clasificación ya está actualizada." };
}

export async function invitePrivateMember(_: PrivateActionState, formData: FormData): Promise<PrivateActionState> {
  const user = await staff();
  const teamId = text(formData, "teamId");
  const role = text(formData, "role");
  const email = text(formData, "email").toLowerCase();
  const access = await loadEditableTeam(teamId);
  if (!user || !access?.owner) return { error: "Solo el propietario del equipo puede invitar." };
  if (!["editor", "viewer"].includes(role)) return { error: "Elige editor o lector." };
  if (!z.string().email().safeParse(email).success) return { error: "Escribe un correo electrónico válido." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("invite_team_member", { p_team_id: teamId, p_email: email, p_role: role as "editor" | "viewer" });
  if (error) return fail(error.message);
  revalidatePath(`/mis-equipos/${access.leagueId}`);
  return { success: `Invitación guardada para ${email}. Debe entrar con ese correo y aceptarla en Mis equipos.` };
}

export async function acceptPrivateInvitations(): Promise<PrivateActionState> {
  const user = await getSessionUser();
  if (!user) return { error: "Inicia sesión con el correo invitado para ver la invitación." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("accept_team_invitations");
  if (error) return { error: "No se pudo comprobar la invitación. Vuelve a intentarlo." };
  revalidatePath("/mis-equipos");
  return { success: Number(data) > 0 ? "Invitación aceptada. Ya puedes consultar tu equipo privado." : "No hay invitaciones pendientes para este correo. Comprueba que entraste con el email invitado." };
}
