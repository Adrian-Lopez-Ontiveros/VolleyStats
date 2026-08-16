"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { logMatchActivity } from "@/lib/actions/activity";
import { notifyMatchFinished } from "@/lib/actions/notifications";
import { requireAdmin } from "@/lib/auth";
import { currentOnCourtIds } from "@/lib/lineup";
import { matchScoreFromSets, parseLineupFromForm, parseManualSetScores } from "@/lib/match-result";
import { createClient } from "@/lib/supabase/server";
import { computeMatchState, resolveScoringTeam, statFromPointType } from "@/lib/volleyball";
import type { MatchLineupEntry, MatchStatus, MatchSubstitution, PointType } from "@/lib/types";

async function loadCourtState(matchId: string, teamId: string) {
  const supabase = await createClient();
  const [{ data: lineup }, { data: substitutions }] = await Promise.all([
    supabase.from("match_lineups").select("player_id, is_starter, is_libero, team_id").eq("match_id", matchId),
    supabase
      .from("match_substitutions")
      .select("player_out_id, player_in_id, team_id")
      .eq("match_id", matchId)
      .order("created_at", { ascending: true }),
  ]);

  return currentOnCourtIds(
    (lineup ?? []) as Pick<MatchLineupEntry, "player_id" | "is_starter" | "is_libero" | "team_id">[],
    (substitutions ?? []) as Pick<MatchSubstitution, "player_out_id" | "player_in_id" | "team_id">[],
    teamId
  );
}

const matchSchema = z.object({
  homeTeamId: z.string().uuid("Selecciona el equipo local"),
  awayTeamId: z.string().uuid("Selecciona el equipo visitante"),
  scheduledAt: z.string().min(1, "La fecha es obligatoria"),
  location: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});

function revalidateMatchStats(input: {
  matchId?: string;
  playerId?: string | null;
  homeTeamId?: string | null;
  awayTeamId?: string | null;
  finished?: boolean;
}) {
  revalidatePath("/partidos");
  if (input.matchId) {
    revalidatePath(`/partidos/${input.matchId}`);
    revalidatePath(`/partidos/${input.matchId}/seguimiento`);
  }
  if (input.finished) {
    revalidatePath("/liga");
    revalidatePath("/jugadores");
    revalidatePath("/perfil");
    if (input.playerId) revalidatePath(`/jugadores/${input.playerId}`);
    if (input.homeTeamId) revalidatePath(`/equipos/${input.homeTeamId}`);
    if (input.awayTeamId) revalidatePath(`/equipos/${input.awayTeamId}`);
  }
}

async function persistComputedMatch(
  matchId: string,
  homeTeamId: string,
  status: "scheduled" | "live" | "finished" | "cancelled"
) {
  const supabase = await createClient();
  const { data: events, error } = await supabase
    .from("match_events")
    .select("scoring_team_id, created_at")
    .eq("match_id", matchId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);

  const computed = computeMatchState(
    events ?? [],
    homeTeamId,
    status === "cancelled" ? "cancelled" : status === "finished" ? "live" : status
  );

  const nextStatus =
    status === "cancelled"
      ? "cancelled"
      : computed.status === "finished"
        ? "finished"
        : status === "scheduled" && (events ?? []).length === 0
          ? "scheduled"
          : "live";

  const { error: updateError } = await supabase
    .from("matches")
    .update({
      home_sets: computed.homeSets,
      away_sets: computed.awaySets,
      current_set: computed.currentSet,
      home_points: computed.homePoints,
      away_points: computed.awayPoints,
      set_scores: computed.setScores,
      status: nextStatus,
    })
    .eq("id", matchId);

  if (updateError) throw new Error(updateError.message);
  return nextStatus;
}

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

  const rows = playerIds.map((playerId) => ({
    match_id: matchId,
    team_id: parsed.teamId,
    player_id: playerId,
    is_starter: parsed.starterIds.includes(playerId),
    is_libero: parsed.liberoId === playerId,
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

async function refreshPlayerStats(playerId: string | null) {
  if (!playerId) return;
  const supabase = await createClient();
  const { error } = await supabase.rpc("recompute_player_stats", {
    p_player_id: playerId,
  });

  if (error) {
    const { data: events } = await supabase
      .from("match_events")
      .select("point_type, match_id")
      .eq("player_id", playerId);

    const stats = {
      attack_points: 0,
      block_points: 0,
      aces: 0,
      errors: 0,
      opponent_errors: 0,
      other_points: 0,
      matches_played: new Set<string>(),
    };

    for (const event of events ?? []) {
      const key = statFromPointType(event.point_type as PointType);
      if (key) stats[key] += 1;
      stats.matches_played.add(event.match_id as string);
    }

    await supabase
      .from("players")
      .update({
        attack_points: stats.attack_points,
        block_points: stats.block_points,
        aces: stats.aces,
        errors: stats.errors,
        opponent_errors: stats.opponent_errors,
        other_points: stats.other_points,
        matches_played: stats.matches_played.size,
      })
      .eq("id", playerId);
  }
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
      scheduled_at: new Date(parsed.data.scheduledAt).toISOString(),
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
      scheduled_at: new Date(parsed.data.scheduledAt).toISOString(),
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
  revalidatePath("/partidos");
  revalidatePath("/liga");
  revalidatePath(`/partidos/${matchId}`);
  redirect(`/partidos/${matchId}`);
}

export async function deleteMatch(matchId: string) {
  await requireAdmin();
  const supabase = await createClient();

  const { data: events } = await supabase
    .from("match_events")
    .select("player_id")
    .eq("match_id", matchId);

  const { error } = await supabase.from("matches").delete().eq("id", matchId);
  if (error) return { error: error.message };

  const uniquePlayers = [
    ...new Set((events ?? []).map((e) => e.player_id).filter(Boolean)),
  ] as string[];
  await Promise.all(uniquePlayers.map((id) => refreshPlayerStats(id)));

  revalidatePath("/partidos");
  revalidatePath("/liga");
  revalidatePath("/jugadores");
  revalidatePath("/perfil");
  redirect("/partidos");
}

export async function setMatchStatus(
  matchId: string,
  status: "scheduled" | "live" | "finished" | "cancelled"
) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from("matches")
    .update({ status })
    .eq("id", matchId);

  if (error) return { error: error.message };

  await logMatchActivity(
    matchId,
    "Cambió el estado",
    status === "finished"
      ? "Finalizó el partido"
      : status === "live"
        ? "Inició el partido"
        : status === "cancelled"
          ? "Canceló el partido"
          : "Volvió a programado"
  );
  if (status === "finished") {
    await notifyMatchFinished(matchId);
  }

  revalidatePath(`/partidos/${matchId}`);
  revalidatePath("/partidos");
  revalidatePath("/liga");
  return { success: true };
}

function parseRotation(value: number | null | undefined) {
  return typeof value === "number" && value >= 1 && value <= 6 ? value : null;
}

export async function recordPoint(input: {
  matchId: string;
  playerId?: string | null;
  actingTeamId: string;
  pointType: PointType;
  servingTeamId?: string | null;
  homeRotation?: number | null;
  awayRotation?: number | null;
}) {
  const session = await requireAdmin();
  const supabase = await createClient();

  const { data: match, error: matchError } = await supabase
    .from("matches")
    .select("id, status, home_team_id, away_team_id, current_set")
    .eq("id", input.matchId)
    .single();

  if (matchError || !match) return { error: "Partido no encontrado" };
  if (match.status === "finished") return { error: "El partido ya ha terminado" };
  if (match.status === "cancelled") return { error: "El partido está cancelado" };

  if (
    input.actingTeamId !== match.home_team_id &&
    input.actingTeamId !== match.away_team_id
  ) {
    return { error: "El equipo no participa en este partido" };
  }

  if (input.playerId) {
    const { data: player } = await supabase
      .from("players")
      .select("id, team_id")
      .eq("id", input.playerId)
      .single();

    if (!player) return { error: "Jugador no encontrado" };
    if (player.team_id && player.team_id !== input.actingTeamId) {
      return { error: "El jugador no pertenece a ese equipo" };
    }

    const onCourt = await loadCourtState(input.matchId, input.actingTeamId);
    if (onCourt && !onCourt.has(input.playerId)) {
      return { error: "Ese jugador no está en pista. Haz el cambio antes de registrarle la acción." };
    }
  }

  const scoringTeamId = resolveScoringTeam(
    input.actingTeamId,
    match.home_team_id,
    match.away_team_id,
    input.pointType
  );

  const servingTeamId =
    input.servingTeamId &&
    (input.servingTeamId === match.home_team_id || input.servingTeamId === match.away_team_id)
      ? input.servingTeamId
      : null;

  if (match.status === "scheduled") {
    await supabase.from("matches").update({ status: "live" }).eq("id", match.id);
  }

  const { error: insertError } = await supabase.from("match_events").insert({
    match_id: match.id,
    set_number: match.current_set,
    player_id: input.playerId || null,
    acting_team_id: input.actingTeamId,
    scoring_team_id: scoringTeamId,
    serving_team_id: servingTeamId,
    home_rotation: parseRotation(input.homeRotation),
    away_rotation: parseRotation(input.awayRotation),
    point_type: input.pointType,
    created_by: session.id,
  });

  if (insertError) return { error: insertError.message };

  try {
    const [nextStatus] = await Promise.all([
      persistComputedMatch(match.id, match.home_team_id, "live"),
      refreshPlayerStats(input.playerId ?? null),
    ]);
    revalidateMatchStats({
      matchId: match.id,
      playerId: input.playerId,
      homeTeamId: match.home_team_id,
      awayTeamId: match.away_team_id,
      finished: nextStatus === "finished",
    });
    if (nextStatus === "finished") {
      await notifyMatchFinished(match.id);
    }
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "No se pudo actualizar el marcador",
    };
  }

  return { success: true };
}

export async function undoLastPoint(matchId: string) {
  await requireAdmin();
  const supabase = await createClient();

  const { data: lastEvent, error } = await supabase
    .from("match_events")
    .select("id, player_id")
    .eq("match_id", matchId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return { error: error.message };
  if (!lastEvent) return { error: "No hay puntos para deshacer" };

  const { data: match } = await supabase
    .from("matches")
    .select("home_team_id, away_team_id")
    .eq("id", matchId)
    .single();

  if (!match) return { error: "Partido no encontrado" };

  const { error: deleteError } = await supabase
    .from("match_events")
    .delete()
    .eq("id", lastEvent.id);

  if (deleteError) return { error: deleteError.message };

  try {
    const [nextStatus] = await Promise.all([
      persistComputedMatch(matchId, match.home_team_id, "live"),
      refreshPlayerStats(lastEvent.player_id),
    ]);
    revalidateMatchStats({
      matchId,
      playerId: lastEvent.player_id,
      homeTeamId: match.home_team_id,
      awayTeamId: match.away_team_id,
      finished: nextStatus === "finished",
    });
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "No se pudo actualizar el marcador",
    };
  }

  return { success: true };
}

const substitutionSchema = z.object({
  playerOutId: z.string().uuid("Selecciona el jugador que sale"),
  playerInId: z.string().uuid("Selecciona el jugador que entra"),
  setNumber: z.string().optional().or(z.literal("")),
  occurredAt: z.string().optional().or(z.literal("")),
});

export async function addSubstitution(matchId: string, formData: FormData) {
  const session = await requireAdmin();
  const parsed = substitutionSchema.safeParse({
    playerOutId: formData.get("playerOutId"),
    playerInId: formData.get("playerInId"),
    setNumber: formData.get("setNumber") ?? "",
    occurredAt: formData.get("occurredAt") ?? "",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos no válidos" };
  }
  if (parsed.data.playerOutId === parsed.data.playerInId) {
    return { error: "El jugador que sale y el que entra deben ser distintos." };
  }

  const setNumber = parsed.data.setNumber ? Number(parsed.data.setNumber) : null;
  if (setNumber !== null && (setNumber < 1 || setNumber > 5 || Number.isNaN(setNumber))) {
    return { error: "El set debe estar entre 1 y 5." };
  }

  const supabase = await createClient();
  const { data: match } = await supabase
    .from("matches")
    .select("id, home_team_id, away_team_id, status, current_set, home_points, away_points")
    .eq("id", matchId)
    .maybeSingle();

  if (!match) return { error: "Partido no encontrado" };
  if (match.status === "cancelled") {
    return { error: "No se pueden registrar cambios en un partido cancelado." };
  }

  const { data: players } = await supabase
    .from("players")
    .select("id, team_id")
    .in("id", [parsed.data.playerOutId, parsed.data.playerInId]);

  if ((players ?? []).length !== 2) return { error: "Jugador no encontrado" };

  const outPlayer = (players ?? []).find((player) => player.id === parsed.data.playerOutId);
  const inPlayer = (players ?? []).find((player) => player.id === parsed.data.playerInId);
  if (!outPlayer?.team_id || outPlayer.team_id !== inPlayer?.team_id) {
    return { error: "Los dos jugadores deben ser del mismo equipo." };
  }
  if (outPlayer.team_id !== match.home_team_id && outPlayer.team_id !== match.away_team_id) {
    return { error: "Ese equipo no juega este partido." };
  }

  const onCourt = await loadCourtState(matchId, outPlayer.team_id);
  if (onCourt) {
    if (!onCourt.has(parsed.data.playerOutId)) {
      return { error: "El jugador que sale no está en pista." };
    }
    if (onCourt.has(parsed.data.playerInId)) {
      return { error: "El jugador que entra ya está en pista." };
    }
  }

  const { error } = await supabase.from("match_substitutions").insert({
    match_id: matchId,
    team_id: outPlayer.team_id,
    player_out_id: parsed.data.playerOutId,
    player_in_id: parsed.data.playerInId,
    set_number: setNumber ?? match.current_set,
    occurred_at:
      parsed.data.occurredAt?.trim() ||
      `${match.home_points}-${match.away_points}`,
    created_by: session.id,
  });

  if (error) return { error: error.message };

  await logMatchActivity(matchId, "Sustitución", "Registró un cambio de jugadores");
  revalidatePath(`/partidos/${matchId}`);
  revalidatePath(`/partidos/${matchId}/seguimiento`);
  return { success: true };
}

export async function deleteSubstitution(matchId: string, substitutionId: string) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from("match_substitutions")
    .delete()
    .eq("id", substitutionId)
    .eq("match_id", matchId);

  if (error) return { error: error.message };

  await logMatchActivity(matchId, "Sustitución", "Eliminó un cambio");
  revalidatePath(`/partidos/${matchId}`);
  revalidatePath(`/partidos/${matchId}/seguimiento`);
  return { success: true };
}
