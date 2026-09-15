"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { involvesClubTeam } from "@/lib/federation/leagues";
import { formatMatchWhen, madridCalendarKey } from "@/lib/federation/schedule";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { unwrapOne } from "@/lib/utils";

export async function setMatchEndNotifications(enabled: boolean) {
  const session = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ notify_match_end: enabled })
    .eq("id", session.id);
  if (error) return { error: error.message };
  revalidatePath("/perfil");
  return { success: true };
}

export async function savePushSubscription(input: {
  endpoint: string;
  p256dh: string;
  auth: string;
}) {
  const session = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: session.id,
      endpoint: input.endpoint,
      p256dh: input.p256dh,
      auth: input.auth,
    },
    { onConflict: "endpoint" }
  );
  if (error) return { error: error.message };
  return { success: true };
}

export async function deletePushSubscription(endpoint: string) {
  const session = await requireUser();
  const supabase = await createClient();
  await supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", session.id)
    .eq("endpoint", endpoint);
  return { success: true };
}

async function notificationDb() {
  return createServiceClient() ?? (await createClient());
}

async function sendPushToOptedIn(title: string, body: string, url: string) {
  const supabase = await notificationDb();
  const { data: profiles } = await supabase.from("profiles").select("id").eq("notify_match_end", true);
  const notifyIds = ((profiles ?? []) as { id: string }[]).map((row) => row.id);
  if (notifyIds.length === 0) return { sent: 0 };

  const { data: subscriptions } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .in("user_id", notifyIds);

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey || !subscriptions?.length) return { sent: 0 };

  try {
    const webpush = await import("web-push");
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || "mailto:admin@fuenlastats.local",
      publicKey,
      privateKey
    );
    await Promise.all(
      (subscriptions as { endpoint: string; p256dh: string; auth: string }[]).map((sub) =>
        webpush
          .sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            JSON.stringify({ title, body, url })
          )
          .catch(() => null)
      )
    );
    return { sent: subscriptions.length };
  } catch {
    return { sent: 0 };
  }
}

export async function notifyMatchFinished(matchId: string) {
  const supabase = await notificationDb();
  const { data: match } = await supabase
    .from("matches")
    .select(
      "id, home_sets, away_sets, location, home_team:teams!matches_home_team_id_fkey(name, short_name), away_team:teams!matches_away_team_id_fkey(name, short_name)"
    )
    .eq("id", matchId)
    .maybeSingle();

  if (!match) return;

  const home = unwrapOne(match.home_team as { name?: string; short_name?: string | null } | { name?: string; short_name?: string | null }[] | null);
  const away = unwrapOne(match.away_team as { name?: string; short_name?: string | null } | { name?: string; short_name?: string | null }[] | null);
  const homeName = home?.short_name || home?.name || "Local";
  const awayName = away?.short_name || away?.name || "Visitante";
  const title = "Resultado del partido";
  const body = `${homeName} ${match.home_sets}-${match.away_sets} ${awayName}`;
  const url = `/partidos/${matchId}`;

  await sendPushToOptedIn(title, body, url);
}

function madridTomorrowKey() {
  const today = madridCalendarKey(new Date().toISOString());
  const [year, month, day] = today.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + 1));
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}-${pad(next.getUTCDate())}`;
}

export async function sendDueMatchReminders() {
  const supabase = await notificationDb();
  const tomorrow = madridTomorrowKey();

  const { data: matches, error } = await supabase
    .from("matches")
    .select(
      "id, scheduled_at, location, notes, status, is_federation, reminder_sent_at, home_team:teams!matches_home_team_id_fkey(name, short_name, is_club_team), away_team:teams!matches_away_team_id_fkey(name, short_name, is_club_team)"
    )
    .eq("status", "scheduled")
    .is("reminder_sent_at", null);

  if (error || !matches?.length) {
    return { sent: 0, matches: 0, error: error?.message };
  }

  const due = (
    matches as {
      id: string;
      scheduled_at: string;
      location: string | null;
      notes: string | null;
      is_federation?: boolean;
      home_team: { name?: string; short_name?: string | null; is_club_team?: boolean } | { name?: string; short_name?: string | null; is_club_team?: boolean }[] | null;
      away_team: { name?: string; short_name?: string | null; is_club_team?: boolean } | { name?: string; short_name?: string | null; is_club_team?: boolean }[] | null;
    }[]
  ).filter((match) => {
    const home = unwrapOne(match.home_team);
    const away = unwrapOne(match.away_team);
    if (!involvesClubTeam({ home_team: home, away_team: away })) return false;
    return madridCalendarKey(match.scheduled_at) === tomorrow;
  });

  if (due.length === 0) return { sent: 0, matches: 0 };

  const lines = due.map((match) => {
    const home = unwrapOne(match.home_team);
    const away = unwrapOne(match.away_team);
    const when = formatMatchWhen({
      scheduledAt: match.scheduled_at,
      notes: match.notes,
      isFederation: match.is_federation,
    });
    const place = match.location ? ` · ${match.location}` : "";
    return `${home?.short_name || home?.name || "Local"} vs ${away?.short_name || away?.name || "Visitante"} · ${when}${place}`;
  });

  const title = due.length === 1 ? "Partido mañana" : "Partidos mañana";
  const body = lines.join(" · ");
  const url = due.length === 1 ? `/partidos/${due[0].id}` : "/partidos";

  await sendPushToOptedIn(title, body, url);

  await supabase
    .from("matches")
    .update({ reminder_sent_at: new Date().toISOString() })
    .in(
      "id",
      due.map((match) => match.id)
    );

  return { sent: due.length, matches: due.length };
}
