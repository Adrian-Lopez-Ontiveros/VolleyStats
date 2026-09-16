"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { logMatchActivity } from "@/lib/actions/activity";
import { resolvePredictionsForMatch } from "@/lib/actions/game";
import { sendDueMatchReminders } from "@/lib/actions/notifications";
import { requireAdmin } from "@/lib/auth";
import { parseCategory, type TeamCategory } from "@/lib/categories";
import { matchScoreFromSets, parseLineupFromForm, parseManualSetScores } from "@/lib/match-result";
import { datetimeLocalMadridToIso } from "@/lib/federation/schedule";
import { createClient } from "@/lib/supabase/server";
import { normalizePersonName } from "@/lib/utils";
import type { MatchStatus, PointType } from "@/lib/types";
import {
  deleteMatch as deleteMatchImpl,
  setMatchStatus as setMatchStatusImpl,
  recordPoint as recordPointImpl,
  undoLastPoint as undoLastPointImpl,
  addSubstitution as addSubstitutionImpl,
  deleteSubstitution as deleteSubstitutionImpl,
  setMatchLibero as setMatchLiberoImpl,
  activateMatchLibero as activateMatchLiberoImpl,
} from "@/lib/actions/match-ops";
import type { LiberoKind } from "@/lib/types";

const CUSTOM_TEAM = "__custom__";

const matchSchema = z.object({
  category: z.string().optional().or(z.literal("")),
  homeTeamId: z.string().optional().or(z.literal("")),
  awayTeamId: z.string().optional().or(z.literal("")),
  homeTeamName: z.string().optional().or(z.literal("")),
  awayTeamName: z.string().optional().or(z.literal("")),
  scheduledAt: z.string().min(1, "La fecha es obligatoria"),
  location: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});

function shortNameFromTeam(name: string) {
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return words
      .map((word) => word[0] ?? "")
      .join("")
      .slice(0, 8)
      .toUpperCase();
  }
  return name.slice(0, 8);
}

async function resolveMatchTeam(
  rawId: string | undefined,
  rawName: string | undefined,
  category: TeamCategory,
  label: string
): Promise<{ id: string } | { error: string }> {
  const id = (rawId ?? "").trim();
  const name = (rawName ?? "").trim();
  const supabase = await createClient();

  if (id && id !== CUSTOM_TEAM) {
    const { data, error } = await supabase.from("teams").select("id").eq("id", id).maybeSingle();
    if (error) return { error: error.message };
    if (!data) return { error: `No se encontró el equipo ${label.toLowerCase()}` };
    return { id: data.id };
  }

  if (name.length < 2) {
    return { error: `Escribe el nombre del equipo ${label.toLowerCase()}` };
  }

  const { data: existing, error: existingError } = await supabase
    .from("teams")
    .select("id, name, category")
    .eq("category", category);
  if (existingError) return { error: existingError.message };

  const needle = normalizePersonName(name);
  const match = (existing ?? []).find((team) => normalizePersonName(team.name) === needle);
  if (match) return { id: match.id };

  const { data: created, error: createError } = await supabase
    .from("teams")
    .insert({
      name,
      short_name: shortNameFromTeam(name),
      category,
      is_club_team: false,
      is_one_off: true,
    })
    .select("id")
    .single();

  if (createError) {
    if (/is_one_off/i.test(createError.message)) {
      return {
        error:
          "Falta ejecutar la migración supabase/migrations/024_one_off_teams.sql para rivales puntuales.",
      };
    }
    return { error: createError.message };
  }
  return { id: created.id };
}

async function saveClubLineup(
  matchId: string,
  homeTeamId: string,
  awayTeamId: string,
  formData: FormData
) {
  const parsed = parseLineupFromForm(formData);
  if (parsed.error) return { error: parsed.error };
  if (
    !parsed.teamId &&
    parsed.starterIds.length === 0 &&
    !parsed.receptionLiberoId &&
    !parsed.defenseLiberoId
  ) {
    return { success: true };
  }
  if (!parsed.teamId) return { success: true };
  if (parsed.teamId !== homeTeamId && parsed.teamId !== awayTeamId) {
    return { error: "La alineación debe ser del equipo del club que juega este partido." };
  }

  const supabase = await createClient();
  const liberoIds = [parsed.receptionLiberoId, parsed.defenseLiberoId].filter(
    (playerId): playerId is string => Boolean(playerId)
  );
  const playerIds = [...new Set([...parsed.starterIds, ...liberoIds])];
  if (playerIds.length > 0) {
    const { data: roster } = await supabase
      .from("players")
      .select("id, team_id")
      .in("id", playerIds);
    if ((roster ?? []).length !== playerIds.length) {
      return { error: "Hay un jugador de la alineación que no existe." };
    }
    if ((roster ?? []).some((player) => player.team_id !== parsed.teamId)) {
      return { error: "Todos los jugadores de la alineación deben ser del equipo del club." };
    }
  }

  const { error: deleteError } = await supabase
    .from("match_lineups")
    .delete()
    .eq("match_id", matchId)
    .eq("team_id", parsed.teamId);
  if (deleteError) return { error: deleteError.message };

  const positionByPlayer = new Map(
    Object.entries(parsed.starterPositions).map(([position, playerId]) => [playerId, Number(position)])
  );

  const activeLiberoId = parsed.receptionLiberoId ?? parsed.defenseLiberoId;
  const rows = playerIds.map((playerId) => {
    const isReception = parsed.receptionLiberoId === playerId;
    const isDefense = parsed.defenseLiberoId === playerId;
    const isLibero = isReception || isDefense;
    return {
      match_id: matchId,
      team_id: parsed.teamId,
      player_id: playerId,
      is_starter: parsed.starterIds.includes(playerId) && !isLibero,
      is_libero: isLibero,
      is_reception_libero: isReception,
      is_defense_libero: isDefense,
      is_active_libero: isLibero && playerId === activeLiberoId,
      court_position: isLibero ? null : positionByPlayer.get(playerId) ?? null,
    };
  });

  if (rows.length === 0) return { success: true };

  const { error: insertError } = await supabase.from("match_lineups").insert(rows);
  if (insertError) {
    if (/is_reception_libero|is_defense_libero|is_active_libero|idx_match_lineups_one_libero/i.test(insertError.message)) {
      return {
        error:
          "Falta ejecutar la migración supabase/migrations/026_dual_liberos.sql para los dos líberos.",
      };
    }
    return { error: insertError.message };
  }
  return { success: true };
}

async function applyManualScores(
  formData: FormData,
  currentStatus: MatchStatus,
  hasLiveEvents: boolean
) {
  if (hasLiveEvents) return { update: {} as Record<string, unknown> };

  const parsed = parseManualSetScores(formData);
  if (parsed.error) return { error: parsed.error };
  if (parsed.scores.length === 0) return { update: {} as Record<string, unknown> };

  return { update: matchScoreFromSets(parsed.scores, currentStatus) };
}

export async function createMatch(formData: FormData) {
  const session = await requireAdmin();
  const parsed = matchSchema.safeParse({
    category: formData.get("category") ?? "",
    homeTeamId: formData.get("homeTeamId") ?? "",
    awayTeamId: formData.get("awayTeamId") ?? "",
    homeTeamName: formData.get("homeTeamName") ?? "",
    awayTeamName: formData.get("awayTeamName") ?? "",
    scheduledAt: formData.get("scheduledAt"),
    location: formData.get("location") ?? "",
    notes: formData.get("notes") ?? "",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos no válidos" };
  }

  const category = parseCategory(parsed.data.category);
  const home = await resolveMatchTeam(
    parsed.data.homeTeamId,
    parsed.data.homeTeamName,
    category,
    "local"
  );
  if ("error" in home) return home;
  const away = await resolveMatchTeam(
    parsed.data.awayTeamId,
    parsed.data.awayTeamName,
    category,
    "visitante"
  );
  if ("error" in away) return away;

  if (home.id === away.id) {
    return { error: "El equipo local y el visitante deben ser distintos" };
  }

  const supabase = await createClient();
  const scores = await applyManualScores(formData, "scheduled", false);
  if (scores.error) return { error: scores.error };

  const { data, error } = await supabase
    .from("matches")
    .insert({
      home_team_id: home.id,
      away_team_id: away.id,
      scheduled_at: datetimeLocalMadridToIso(parsed.data.scheduledAt),
      location: parsed.data.location?.trim() || null,
      notes: parsed.data.notes?.trim() || null,
      created_by: session.id,
      is_federation: false,
      ...scores.update,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  const lineup = await saveClubLineup(
    data.id,
    home.id,
    away.id,
    formData
  );
  if (lineup.error) return { error: lineup.error };

  await logMatchActivity(data.id, "Creó el partido", "Amistoso dado de alta");
  await sendDueMatchReminders();
  revalidatePath("/partidos");
  revalidatePath("/liga");
  redirect(`/partidos/${data.id}`);
}

export async function updateMatch(matchId: string, formData: FormData) {
  await requireAdmin();
  const parsed = matchSchema.safeParse({
    category: formData.get("category") ?? "",
    homeTeamId: formData.get("homeTeamId") ?? "",
    awayTeamId: formData.get("awayTeamId") ?? "",
    homeTeamName: formData.get("homeTeamName") ?? "",
    awayTeamName: formData.get("awayTeamName") ?? "",
    scheduledAt: formData.get("scheduledAt"),
    location: formData.get("location") ?? "",
    notes: formData.get("notes") ?? "",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos no válidos" };
  }

  const category = parseCategory(parsed.data.category);
  const home = await resolveMatchTeam(
    parsed.data.homeTeamId,
    parsed.data.homeTeamName,
    category,
    "local"
  );
  if ("error" in home) return home;
  const away = await resolveMatchTeam(
    parsed.data.awayTeamId,
    parsed.data.awayTeamName,
    category,
    "visitante"
  );
  if ("error" in away) return away;

  if (home.id === away.id) {
    return { error: "El equipo local y el visitante deben ser distintos" };
  }

  const supabase = await createClient();
  const { data: current } = await supabase
    .from("matches")
    .select("id, status, home_team_id, away_team_id")
    .eq("id", matchId)
    .maybeSingle();

  if (!current) return { error: "Partido no encontrado" };
  if (current.status === "cancelled") {
    return { error: "No se puede editar un partido cancelado." };
  }

  const { count } = await supabase
    .from("match_events")
    .select("id", { count: "exact", head: true })
    .eq("match_id", matchId);

  const scores = await applyManualScores(
    formData,
    current.status as MatchStatus,
    (count ?? 0) > 0
  );
  if (scores.error) return { error: scores.error };

  const nextHome = current.status === "scheduled" ? home.id : current.home_team_id;
  const nextAway = current.status === "scheduled" ? away.id : current.away_team_id;

  const { error } = await supabase
    .from("matches")
    .update({
      home_team_id: nextHome,
      away_team_id: nextAway,
      scheduled_at: datetimeLocalMadridToIso(parsed.data.scheduledAt),
      location: parsed.data.location?.trim() || null,
      notes: parsed.data.notes?.trim() || null,
      ...scores.update,
    })
    .eq("id", matchId);

  if (error) return { error: error.message };

  const lineup = await saveClubLineup(matchId, nextHome, nextAway, formData);
  if (lineup.error) return { error: lineup.error };

  await logMatchActivity(
    matchId,
    "Editó el partido",
    scores.update && Object.keys(scores.update).length > 0
      ? "Actualizó datos, resultado o alineación"
      : "Actualizó datos o alineación"
  );
  if ((scores.update as { status?: string } | undefined)?.status === "finished") {
    await resolvePredictionsForMatch(matchId);
  }
  revalidatePath("/partidos");
  revalidatePath("/liga");
  revalidatePath(`/partidos/${matchId}`);
  redirect(`/partidos/${matchId}`);
}

export async function deleteMatch(matchId: string) {
  return deleteMatchImpl(matchId);
}

export async function setMatchStatus(
  matchId: string,
  status: "scheduled" | "live" | "finished" | "cancelled"
) {
  return setMatchStatusImpl(matchId, status);
}

export async function recordPoint(input: {
  matchId: string;
  playerId?: string | null;
  actingTeamId: string;
  pointType: PointType;
  servingTeamId?: string | null;
  homeRotation?: number | null;
  awayRotation?: number | null;
  setNumber?: number | null;
}) {
  return recordPointImpl(input);
}

export async function undoLastPoint(matchId: string) {
  return undoLastPointImpl(matchId);
}

export async function addSubstitution(matchId: string, formData: FormData) {
  return addSubstitutionImpl(matchId, formData);
}

export async function deleteSubstitution(matchId: string, substitutionId: string) {
  return deleteSubstitutionImpl(matchId, substitutionId);
}

export async function setMatchLibero(
  matchId: string,
  teamId: string,
  kind: LiberoKind,
  playerId: string | null
) {
  return setMatchLiberoImpl(matchId, teamId, kind, playerId);
}

export async function activateMatchLibero(matchId: string, teamId: string, kind: LiberoKind) {
  return activateMatchLiberoImpl(matchId, teamId, kind);
}
