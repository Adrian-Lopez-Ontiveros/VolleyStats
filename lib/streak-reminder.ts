// Aviso de racha (opt-in, migración 047). Solo servidor: lo llama el cron diario.
import { pushDb, sendPushToPref } from "@/lib/push";

function madridDate(offsetDays = 0) {
  const now = new Date(Date.now() + offsetDays * 86_400_000);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/**
 * Avisa a quien tiene racha ≥ 1, entró ayer (Madrid) y hoy todavía no: si no entra
 * antes de medianoche, la racha vuelve a 1. Requiere notify_streak_reminder y
 * suscripción push (lo filtra sendPushToPref). Idempotente con streak_reminded_on.
 */
export async function sendStreakReminders() {
  const supabase = await pushDb();
  const today = madridDate();
  const yesterday = madridDate(-1);

  const { data, error } = await supabase
    .from("user_progress")
    .select("user_id, current_streak, streak_reminded_on")
    .eq("last_checkin_on", yesterday)
    .gte("current_streak", 1);
  if (error) {
    // Sin la migración 047 (streak_reminded_on) no se envía nada.
    return { ok: false, sent: 0, error: error.message };
  }

  const atRisk = ((data ?? []) as {
    user_id: string;
    current_streak: number;
    streak_reminded_on: string | null;
  }[]).filter((row) => row.streak_reminded_on !== today);
  if (atRisk.length === 0) return { ok: true, candidates: 0, sent: 0 };

  // Mismo texto para la misma racha: un envío por grupo.
  const byStreak = new Map<number, string[]>();
  for (const row of atRisk) {
    const list = byStreak.get(row.current_streak) ?? [];
    list.push(row.user_id);
    byStreak.set(row.current_streak, list);
  }

  let sent = 0;
  for (const [streak, userIds] of byStreak) {
    const result = await sendPushToPref(
      supabase,
      "notify_streak_reminder",
      {
        title: "🔥 Tu racha está en peligro",
        body:
          streak === 1
            ? "Aún no has entrado hoy. Entra antes de medianoche para empezar tu racha."
            : `Llevas ${streak} días seguidos. Entra antes de medianoche para no perderla.`,
        url: "/hoy",
      },
      userIds
    );
    sent += result.sent;
  }

  await supabase
    .from("user_progress")
    .update({ streak_reminded_on: today })
    .in(
      "user_id",
      atRisk.map((row) => row.user_id)
    );

  return { ok: true, candidates: atRisk.length, sent };
}
