"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser, requireUser } from "@/lib/auth";
import { MATCH_LIST_SELECT, MATCH_LIST_SELECT_BASE, USER_PROGRESS_SELECT } from "@/lib/constants";
import { involvesClubTeam } from "@/lib/federation/leagues";
import { jornadaKeyFromIso, jornadaRangeLabel, nearestJornadaKey } from "@/lib/game";
import { createClient } from "@/lib/supabase/server";
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

export async function saveMatchPrediction(matchId: string, winnerId: string) {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.rpc("game_save_prediction", {
    p_match_id: matchId,
    p_winner_id: winnerId,
  });
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
    return { error: error.message.replace(/^.*:\s*/, "") || "No se pudo equipar" };
  }
  revalidatePath("/predicciones");
  revalidatePath("/perfil");
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

export async function loadGamePageData() {
  const session = await requireUser();
  const supabase = await createClient();

  await supabase.rpc("game_resolve_pending");

  const [
    { data: progress, error: progressError },
    { data: rewards },
    { data: matches, error: matchesError },
    { data: predictions },
    { data: board },
    { data: profiles },
  ] = await Promise.all([
    supabase
      .from("user_progress")
      .select(USER_PROGRESS_SELECT as "*")
      .eq("user_id", session.id)
      .maybeSingle(),
    supabase.from("user_rewards").select("user_id, reward_id, unlocked_at").eq("user_id", session.id),
    supabase
      .from("matches")
      .select(MATCH_LIST_SELECT as "*")
      .order("scheduled_at", { ascending: true })
      .then(async (result) => {
        if (result.error && /sets_to_win/i.test(result.error.message)) {
          return supabase
            .from("matches")
            .select(MATCH_LIST_SELECT_BASE as "*")
            .order("scheduled_at", { ascending: true });
        }
        return result;
      }),
    supabase
      .from("match_predictions")
      .select("id, user_id, match_id, predicted_winner_id, created_at, updated_at, resolved_at, is_correct, xp_awarded")
      .eq("user_id", session.id),
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
  const mine = (predictions ?? []) as MatchPrediction[];
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
            canPredict: nearest.matches.some((match) => match.status === "scheduled"),
          },
        ]
      : []),
    ...lastClosed,
  ];

  const scoreByUser = new Map<string, { points: number; played: number }>();
  const { data: allPreds } = await supabase
    .from("match_predictions")
    .select("user_id, is_correct")
    .not("is_correct", "is", null);
  for (const row of allPreds ?? []) {
    const pred = row as { user_id: string; is_correct: boolean | null };
    if (pred.is_correct == null) continue;
    const current = scoreByUser.get(pred.user_id) ?? { points: 0, played: 0 };
    current.played += 1;
    if (pred.is_correct) current.points += 1;
    scoreByUser.set(pred.user_id, current);
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

  const leaderboard: GameLeaderRow[] = [...scoreByUser.entries()]
    .map(([userId, score]) => {
      const profile = profileById.get(userId);
      const look = cosmetics.get(userId);
      return {
        userId,
        name: profile?.full_name || "Jugador",
        avatarUrl: profile?.avatar_url ?? null,
        title: look?.equipped_title ?? null,
        frame: look?.equipped_frame ?? null,
        points: score.points,
        played: score.played,
      };
    })
    .sort((a, b) => b.points - a.points || b.played - a.played)
    .slice(0, 20);

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
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }) as UserProgress,
    rewards: (rewards ?? []) as UserReward[],
    jornadas: ordered,
    predictions: byMatch,
    leaderboard,
    community,
    userId: session.id,
  };
}
