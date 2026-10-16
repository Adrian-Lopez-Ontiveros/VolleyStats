import type { Metadata } from "next";
import { SettingsScreen, type NotifyPrefs } from "@/components/settings/settings-screen";
import { APP_VERSION } from "@/lib/app-version";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Ajustes" };

const DEFAULT_PREFS: NotifyPrefs = {
  notify_league_results: true,
  notify_news: true,
  notify_match_reminder: true,
  notify_team_stats: false,
};

export default async function SettingsPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const [prefsResult, subsResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("notify_league_results, notify_news, notify_match_reminder, notify_team_stats")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("push_subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
  ]);

  // Sin la migración 042 las columnas no existen: se muestran los valores por defecto.
  const prefs = prefsResult.error
    ? DEFAULT_PREFS
    : { ...DEFAULT_PREFS, ...((prefsResult.data as Partial<NotifyPrefs> | null) ?? {}) };

  return (
    <SettingsScreen
      userId={user.id}
      name={user.profile.full_name}
      email={user.email}
      avatarUrl={user.profile.avatar_url ?? user.profile.player?.avatar_url ?? null}
      initialPrefs={prefs}
      hasSubscription={(subsResult.count ?? 0) > 0}
      version={APP_VERSION}
    />
  );
}
