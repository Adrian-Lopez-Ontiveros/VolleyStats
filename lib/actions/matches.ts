"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { logMatchActivity } from "@/lib/actions/activity";
import { resolvePredictionsForMatch } from "@/lib/actions/game";
import { requireAdmin } from "@/lib/auth";
import { matchScoreFromSets, parseLineupFromForm, parseManualSetScores } from "@/lib/match-result";
import { datetimeLocalMadridToIso } from "@/lib/federation/schedule";
import { createClient } from "@/lib/supabase/server";
import type { MatchStatus, PointType } from "@/lib/types";
import {
  deleteMatch as deleteMatchImpl,
  setMatchStatus as setMatchStatusImpl,
  recordPoint as recordPointImpl,
  undoLastPoint as undoLastPointImpl,
  addSubstitution as addSubstitutionImpl,
  deleteSubstitution as deleteSubstitutionImpl,
} from "@/lib/actions/match-ops";

const matchSchema = z.object({
  homeTeamId: z.string().uuid("Selecciona el equipo local"),
  awayTeamId: z.string().uuid("Selecciona el equipo visitante"),
  scheduledAt: z.string().min(1, "La fecha es obligatoria"),
  location: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});

async function saveClubLineup(
  matchId: string,
  homeTeamId: string,
  awayTeamId: string,
  formData: FormData
) {
  const parsed = parseLineupFromForm(formData);
  if (parsed.error) return { error: parsed.error };
  if (!parsed.teamId && parsed.starterIds.length === 0 && !parsed.liberoId) {
    return { success: true };
  }
  if (!parsed.teamId) return { success: true };
  if (parsed.teamId !== homeTeamId && parsed.teamId !== awayTeamId) {
    return { error: "La alineación debe ser del equipo del club que juega este partido." };
  }

  const supabase = await createClient();
  const playerIds = [...new Set([...parsed.starterIds, parsed.liberoId].filter(Boolean))] as string[];
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

  const rows = playerIds.map((playerId) => ({
    match_id: matchId,
    team_id: parsed.teamId,
    player_id: playerId,
    is_starter: parsed.starterIds.includes(playerId),
    is_libero: parsed.liberoId === playerId,
    court_position: positionByPlayer.get(playerId) ?? null,
  }));

  if (rows.length === 0) return { success: true };

  const { error: insertError } = await supabase.from("match_lineups").insert(rows);
  if (insertError) return { error: insertError.message };
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
    homeTeamId: formData.get("homeTeamId"),
    awayTeamId: formData.get("awayTeamId"),
    scheduledAt: formData.get("scheduledAt"),
    location: formData.get("location") ?? "",
    notes: formData.get("notes") ?? "",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos no válidos" };
  }

  if (parsed.data.homeTeamId === parsed.data.awayTeamId) {
    return { error: "El equipo local y el visitante deben ser distintos" };
  }

  const supabase = await createClient();
  const { data: sides } = await supabase
    .from("teams")
    .select("id, category")
    .in("id", [parsed.data.homeTeamId, parsed.data.awayTeamId]);

  if ((sides ?? []).length === 2) {
    const [home, away] = sides ?? [];
    if (home.category && away.category && home.category !== away.category) {
      return { error: "Local y visitante deben pertenecer a la misma liga." };
    }
  }

  const scores = await applyManualScores(formData, "scheduled", false);
  if (scores.error) return { error: scores.error };

  const { data, error } = await supabase
    .from("matches")
    .insert({
      home_team_id: parsed.data.homeTeamId,
      away_team_id: parsed.data.awayTeamId,
      scheduled_at: datetimeLocalMadridToIso(parsed.data.scheduledAt),
      location: parsed.data.location?.trim() || null,
      notes: parsed.data.notes?.trim() || null,
      created_by: session.id,
      ...scores.update,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  const lineup = await saveClubLineup(
    data.id,
    parsed.data.homeTeamId,
    parsed.data.awayTeamId,
    formData
  );
  if (lineup.error) return { error: lineup.error };

  await logMatchActivity(data.id, "Creó el partido", "Partido dado de alta");
  revalidatePath("/partidos");
  revalidatePath("/liga");
  redirect(`/partidos/${data.id}`);
}

export async function updateMatch(matchId: string, formData: FormData) {
  await requireAdmin();
  const parsed = matchSchema.safeParse({
    homeTeamId: formData.get("homeTeamId"),
    awayTeamId: formData.get("awayTeamId"),
    scheduledAt: formData.get("scheduledAt"),
    location: formData.get("location") ?? "",
    notes: formData.get("notes") ?? "",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos no válidos" };
  }

  if (parsed.data.homeTeamId === parsed.data.awayTeamId) {
    return { error: "El equipo local y el visitante deben ser distintos" };
  }

  const supabase = await createClient();
  const { data: sides } = await supabase
    .from("teams")
    .select("id, category")
    .in("id", [parsed.data.homeTeamId, parsed.data.awayTeamId]);

  if ((sides ?? []).length === 2) {
    const [home, away] = sides ?? [];
    if (home.category && away.category && home.category !== away.category) {
      return { error: "Local y visitante deben pertenecer a la misma liga." };
    }
  }

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

  const nextHome =
    current.status === "scheduled" ? parsed.data.homeTeamId : current.home_team_id;
  const nextAway =
    current.status === "scheduled" ? parsed.data.awayTeamId : current.away_team_id;

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
