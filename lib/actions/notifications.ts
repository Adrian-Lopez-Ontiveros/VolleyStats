"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

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

export async function notifyMatchFinished(matchId: string) {
  const supabase = await createClient();
  const { data: match } = await supabase
    .from("matches")
    .select(
      "id, home_sets, away_sets, home_team_id, away_team_id, home_team:teams!matches_home_team_id_fkey(name, short_name), away_team:teams!matches_away_team_id_fkey(name, short_name)"
    )
    .eq("id", matchId)
    .maybeSingle();

  if (!match) return;

  const home = Array.isArray(match.home_team) ? match.home_team[0] : match.home_team;
  const away = Array.isArray(match.away_team) ? match.away_team[0] : match.away_team;
  const title = "Partido finalizado";
  const body = `${home?.short_name || home?.name || "Local"} ${match.home_sets}-${match.away_sets} ${away?.short_name || away?.name || "Visitante"}`;
  const url = `/partidos/${matchId}/resumen`;

  const { data: players } = await supabase
    .from("players")
    .select("user_id")
    .in("team_id", [match.home_team_id, match.away_team_id])
    .not("user_id", "is", null);

  const userIds = [...new Set((players ?? []).map((row) => row.user_id).filter(Boolean))] as string[];
  if (userIds.length === 0) return;

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id")
    .in("id", userIds)
    .eq("notify_match_end", true);

  const notifyIds = (profiles ?? []).map((row) => row.id);
  if (notifyIds.length === 0) return;

  const { data: subscriptions } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .in("user_id", notifyIds);

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey || !subscriptions?.length) return;

  try {
    const webpush = await import("web-push");
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || "mailto:admin@fuenlastats.local",
      publicKey,
      privateKey
    );
    await Promise.all(
      subscriptions.map((sub) =>
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
  } catch {
    // Sin web-push o claves VAPID: las notificaciones locales siguen disponibles.
  }
}
