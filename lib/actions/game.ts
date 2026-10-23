"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser, requireUser } from "@/lib/auth";
import { MATCH_LIST_VARIANTS, selectWithMatchFallback } from "@/lib/match-query";
import { MATCH_PREDICTION_SELECT, MATCH_PREDICTION_SELECT_SCORE, setsToWinOf } from "@/lib/constants";
import {
  cleanPredictedSets,
  missingPredictionScoreArgs,
  missingPredictionScoreColumn,
  predictionTablePoints,
} from "@/lib/prediction-score";
import { readUserProgress } from "@/lib/user-progress";
import { involvesClubTeam } from "@/lib/federation/leagues";
import {
  DAILY_CHALLENGES,
  FRAME_NONE,
  isPredictionLocked,
  jornadaKeyFromIso,
  jornadaRangeLabel,
  madridMonthKey,
  madridMonthLabel,
  nearestJornadaKey,
} from "@/lib/game";
import { createClient } from "@/lib/supabase/server";
import type { DailyChallengeStatus } from "@/lib/game";
import type {
  CheckinResult,
  GameLeaderRow,
  JornadaBoard,
  MatchPrediction,
  MatchWithTeams,
  UserProgress,
  UserReward,
} from "@/lib/types";

function asCheckinResult(value: unknown): CheckinResult | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const unlocked = Array.isArray(row.unlocked)
    ? row.unlocked.filter((item): item is string => typeof item === "string")
    : [];
  return {
    claimed: Boolean(row.claimed),
    already: Boolean(row.already),
    xp_gained: Number(row.xp_gained ?? 0),
    xp: Number(row.xp ?? 0),
    level: Number(row.level ?? 1),
    streak: Number(row.streak ?? 0),
    longest: Number(row.longest ?? 0),
    leveled_up: Boolean(row.leveled_up),
    unlocked,
    equipped_title: typeof row.equipped_title === "string" ? row.equipped_title : null,
    equipped_frame: typeof row.equipped_frame === "string" ? row.equipped_frame : null,
  };
}

function isMissingGameSchema(message?: string) {
  if (!message) return false;
  return /user_progress|match_predictions|game_claim|schema cache|does not exist/i.test(message);
}

export async function claimDailyCheckin(): Promise<CheckinResult | null> {
  const session = await getSessionUser();
  if (!session) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("game_claim_daily_checkin");
  if (error) {
    if (isMissingGameSchema(error.message)) return null;
    return null;
  }
  const result = asCheckinResult(data);
  if (!result) return null;
  if (result.claimed) {
    revalidatePath("/predicciones");
    revalidatePath("/perfil");
  }
  return result;
}

export async function saveMatchPrediction(
  matchId: string,
  winnerId: string,
  homeSets?: number | null,
  awaySets?: number | null
) {
  await requireUser();
  const supabase = await createClient();
  const { data: match, error: matchError } = await supabase
    .from("matches")
    .select("id, status, scheduled_at, home_team_id, away_team_id, sets_to_win, is_federation")
    .eq("id", matchId)
    .maybeSingle();
  if (matchError || !match) return { error: matchError?.message ?? "Partido no encontrado" };
  if (match.status !== "scheduled") {
    return { error: "Las predicciones se cierran cuando el partido empieza" };
  }
  if (isPredictionLocked(match.scheduled_at)) {
    return { error: "Las predicciones se cierran 5 minutos antes del partido" };
  }
  const winnerIsHome = winnerId === match.home_team_id;
  if (!winnerIsHome && winnerId !== match.away_team_id) {
    return { error: "Elige el equipo local o el visitante" };
  }
  const cleaned = cleanPredictedSets(
    winnerIsHome ? "home" : "away",
    setsToWinOf(match),
    homeSets,
    awaySets
  );
  if ("error" in cleaned) return cleaned;

  const saved = await supabase.rpc("game_save_prediction", {
    p_match_id: matchId,
    p_winner_id: winnerId,
    p_home_sets: cleaned.home,
    p_away_sets: cleaned.away,
  });
  let error = saved.error;
  if (error && missingPredictionScoreArgs(error.message)) {
    if (cleaned.home != null || cleaned.away != null) {
      return {
        error:
          "Falta ejecutar la migración supabase/migrations/037_prediction_exact_score.sql para guardar el resultado.",
      };
    }
    const retry = await supabase.rpc("game_save_prediction", {
      p_match_id: matchId,
      p_winner_id: winnerId,
    });
    error = retry.error;
  }
  if (error) {
    return { error: error.message.replace(/^.*:\s*/, "") || "No se pudo guardar la predicción" };
  }
  return { success: true };
}

export async function equipReward(rewardId: string) {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.rpc("game_equip_reward", { p_reward_id: rewardId });
  if (error) {
    const message = error.message.replace(/^.*:\s*/, "");
    if (
      rewardId === FRAME_NONE &&
      /desbloqueado|no se puede equipar|no válida|does not exist|schema cache/i.test(message)
    ) {
      return { error: "Para quitar el marco aplica la migración 035 en Supabase." };
    }
    return { error: message || "No se pudo equipar" };
  }
  revalidatePath("/predicciones");
  revalidatePath("/perfil");
  revalidatePath("/perfil/carta");
  revalidatePath("/jugadores", "layout");
  revalidatePath("/equipos", "layout");
  return { success: true };
}

export async function resolvePredictionsForMatch(matchId: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("game_resolve_match_predictions", {
    p_match_id: matchId,
  });
  if (error && !isMissingGameSchema(error.message)) {
    return { error: error.message };
  }
  revalidatePath("/predicciones");
  return { success: true };
}

export async function resolvePendingPredictions() {
  const supabase = await createClient();
  const { error } = await supabase.rpc("game_resolve_pending");
  if (error && !isMissingGameSchema(error.message)) {
    return { error: error.message };
  }
  return { success: true };
}

function asInt(value: unknown) {
  if (typeof value === "number" && Number.isInteger(value)) return value;
  if (typeof value === "string" && /^-?\d+$/.test(value)) return Number(value);
  return null;
}

function asPrediction(row: Record<string, unknown>): MatchPrediction {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    match_id: String(row.match_id),
    predicted_winner_id: String(row.predicted_winner_id),
    predicted_home_sets: asInt(row.predicted_home_sets),
    predicted_away_sets: asInt(row.predicted_away_sets),
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
    resolved_at: typeof row.resolved_at === "string" ? row.resolved_at : null,
    is_correct: typeof row.is_correct === "boolean" ? row.is_correct : null,
    points: asInt(row.points),
    xp_awarded: Number(row.xp_awarded ?? 0),
  };
}

export async function loadGamePageData() {
  const session = await requireUser();
  const supabase = await createClient();

  await supabase.rpc("game_resolve_pending");
  await supabase.rpc("game_sync_leader_card");

  const [
    { data: progress, error: progressError },
    { data: rewards },
    { data: matches, error: matchesError },
    { data: predictions },
    { data: board },
    { data: profiles },
  ] = await Promise.all([
    readUserProgress((columns) =>
      supabase.from("user_progress").select(columns).eq("user_id", session.id).maybeSingle()
    ),
    supabase.from("user_rewards").select("user_id, reward_id, unlocked_at").eq("user_id", session.id),
    selectWithMatchFallback(MATCH_LIST_VARIANTS, (columns) =>
      supabase.from("matches").select(columns as "*").order("scheduled_at", { ascending: true })
    ),
    (async () => {
      const full = await supabase
        .from("match_predictions")
        .select(MATCH_PREDICTION_SELECT_SCORE)
        .eq("user_id", session.id);
      if (full.error && missingPredictionScoreColumn(full.error.message)) {
        return supabase
          .from("match_predictions")
          .select(MATCH_PREDICTION_SELECT)
          .eq("user_id", session.id);
      }
      return full;
    })(),
    supabase
      .from("user_progress")
      .select("user_id, xp, level, current_streak, equipped_title, equipped_frame"),
    supabase.from("profiles").select("id, full_name, avatar_url"),
  ]);

  if (progressError && isMissingGameSchema(progressError.message)) {
    return { ok: false as const, missingSchema: true as const };
  }
  if (progressError) {
    return { ok: false as const, error: progressError.message };
  }
  if (matchesError) {
    return { ok: false as const, error: matchesError.message };
  }

  const clubMatches = ((matches ?? []) as MatchWithTeams[]).filter(involvesClubTeam);
  const mine = ((predictions ?? []) as Record<string, unknown>[]).map(asPrediction);
  const byMatch = new Map(mine.map((row) => [row.match_id, row]));

  const groups = new Map<string, MatchWithTeams[]>();
  for (const match of clubMatches) {
    const key = jornadaKeyFromIso(match.scheduled_at);
    const list = groups.get(key) ?? [];
    list.push(match);
    groups.set(key, list);
  }

  const allJornadas: JornadaBoard[] = [...groups.entries()].map(([key, list]) => {
    const open = list.some((match) => match.status === "scheduled" || match.status === "live");
    return {
      key,
      label: jornadaRangeLabel(list.map((match) => match.scheduled_at)),
      matches: list,
      open,
      canPredict: false,
    };
  });

  const nearestKey = nearestJornadaKey(clubMatches);
  const nearest = allJornadas.find((item) => item.key === nearestKey) ?? null;
  const lastClosed = allJornadas
    .filter((item) => item.key !== nearestKey && !item.open)
    .sort((a, b) => {
      const aTime = new Date(a.matches[0]?.scheduled_at ?? 0).getTime();
      const bTime = new Date(b.matches[0]?.scheduled_at ?? 0).getTime();
      return bTime - aTime;
    })
    .slice(0, 1)
    .map((item) => ({ ...item, canPredict: false, open: false }));

  const ordered: JornadaBoard[] = [
    ...(nearest
      ? [
          {
            ...nearest,
            canPredict: nearest.matches.some(
              (match) => match.status === "scheduled" && !isPredictionLocked(match.scheduled_at)
            ),
          },
        ]
      : []),
    ...lastClosed,
  ];

  type Score = { points: number; played: number; exact: number };
  const scoreByUser = new Map<string, Score>();
  const monthScoreByUser = new Map<string, Score>();
  const monthKey = madridMonthKey(new Date().toISOString());
  const fullScores = await supabase
    .from("match_predictions")
    .select("user_id, is_correct, points, resolved_at")
    .not("is_correct", "is", null);
  const scoreQuery =
    fullScores.error && missingPredictionScoreColumn(fullScores.error.message)
      ? await supabase
          .from("match_predictions")
          .select("user_id, is_correct, resolved_at")
          .not("is_correct", "is", null)
      : fullScores;
  const addScore = (
    target: Map<string, Score>,
    pred: { user_id: string; points?: number | null; is_correct: boolean | null }
  ) => {
    const current = target.get(pred.user_id) ?? { points: 0, played: 0, exact: 0 };
    current.played += 1;
    current.points += predictionTablePoints(pred);
    if (pred.points === 2) current.exact += 1;
    target.set(pred.user_id, current);
  };
  for (const row of scoreQuery.data ?? []) {
    const pred = row as {
      user_id: string;
      is_correct: boolean | null;
      points?: number | null;
      resolved_at?: string | null;
    };
    if (pred.is_correct == null) continue;
    addScore(scoreByUser, pred);
    // Clasificación mensual: puntos de pronósticos resueltos en el mes natural actual (hora de Madrid).
    if (pred.resolved_at && madridMonthKey(pred.resolved_at) === monthKey) {
      addScore(monthScoreByUser, pred);
    }
  }

  const profileById = new Map(
    ((profiles ?? []) as { id: string; full_name: string; avatar_url: string | null }[]).map((row) => [
      row.id,
      row,
    ])
  );

  const cosmetics = new Map(
    ((board ?? []) as {
      user_id: string;
      equipped_title: string | null;
      equipped_frame: string | null;
    }[]).map((row) => [row.user_id, row])
  );

  const playerByUser = new Map<string, string>();
  const rankedIds = [...new Set([...scoreByUser.keys(), ...monthScoreByUser.keys()])];
  if (rankedIds.length > 0) {
    const { data: playerLinks } = await supabase
      .from("players")
      .select("id, user_id")
      .in("user_id", rankedIds)
      .order("created_at", { ascending: true });
    for (const row of playerLinks ?? []) {
      const link = row as { id: string; user_id: string | null };
      if (link.user_id && !playerByUser.has(link.user_id)) playerByUser.set(link.user_id, link.id);
    }
  }

  const rankRows = (scores: Map<string, Score>): GameLeaderRow[] =>
    [...scores.entries()]
      .sort(
        ([userA, a], [userB, b]) =>
          b.points - a.points ||
          b.exact - a.exact ||
          a.played - b.played ||
          userA.localeCompare(userB)
      )
      .slice(0, 20)
      .map(([userId, score]) => {
        const profile = profileById.get(userId);
        const look = cosmetics.get(userId);
        return {
          userId,
          playerId: playerByUser.get(userId) ?? null,
          name: profile?.full_name || "Jugador",
          avatarUrl: profile?.avatar_url ?? null,
          title: look?.equipped_title ?? null,
          frame: look?.equipped_frame ?? null,
          points: score.points,
          played: score.played,
        };
      });
  const leaderboard = rankRows(scoreByUser);
  const monthlyLeaderboard = rankRows(monthScoreByUser);

  const community = new Map<string, { home: number; away: number }>();
  const { data: communityRows } = await supabase
    .from("match_predictions")
    .select("match_id, predicted_winner_id");
  for (const row of communityRows ?? []) {
    const pred = row as { match_id: string; predicted_winner_id: string };
    const current = community.get(pred.match_id) ?? { home: 0, away: 0 };
    const match = clubMatches.find((item) => item.id === pred.match_id);
    if (!match) continue;
    if (pred.predicted_winner_id === match.home_team_id) current.home += 1;
    if (pred.predicted_winner_id === match.away_team_id) current.away += 1;
    community.set(pred.match_id, current);
  }

  return {
    ok: true as const,
    progress: (progress ?? {
      user_id: session.id,
      xp: 0,
      level: 1,
      current_streak: 0,
      longest_streak: 0,
      last_checkin_on: null,
      equipped_title: null,
      equipped_frame: null,
      equipped_card: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }) as UserProgress,
    rewards: (rewards ?? []) as UserReward[],
    jornadas: ordered,
    predictions: byMatch,
    leaderboard,
    monthlyLeaderboard,
    monthLabel: madridMonthLabel(new Date()),
    community,
    userId: session.id,
  };
}

/**
 * Retos diarios (migración 046): evalúa, cobra la XP pendiente una vez al día y devuelve
 * el estado. Sin la migración devuelve null y la UI muestra los retos como «próximamente».
 */
export async function loadDailyChallenges(): Promise<{
  challenges: DailyChallengeStatus[];
  xpGained: number;
} | null> {
  const session = await getSessionUser();
  if (!session) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("game_daily_challenges");
  if (error || !data) return null;
  const raw = data as {
    xp_gained?: number;
    challenges?: { id: string; done: boolean; claimed: boolean; xp: number }[];
  };
  const byId = new Map((raw.challenges ?? []).map((row) => [row.id, row]));
  const challenges = DAILY_CHALLENGES.map((def) => {
    const row = byId.get(def.id);
    return {
      id: def.id,
      label: def.label,
      hint: def.hint,
      xp: row?.xp ?? def.xp,
      done: row?.done === true,
      claimed: row?.claimed === true,
    };
  });
  return { challenges, xpGained: raw.xp_gained ?? 0 };
}
