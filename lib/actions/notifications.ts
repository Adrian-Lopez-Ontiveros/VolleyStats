"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { NOTIFY_PREF_KEYS, type NotifyPrefKey } from "@/lib/push";
import { createClient } from "@/lib/supabase/server";

/** Guarda una preferencia de aviso (lista blanca de claves). */
export async function updateNotificationPref(key: string, value: boolean) {
  if (!(NOTIFY_PREF_KEYS as readonly string[]).includes(key) || typeof value !== "boolean") {
    return { error: "Preferencia no válida" };
  }
  const session = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ [key as NotifyPrefKey]: value })
    .eq("id", session.id);
  if (error) {
    if (key === "notify_streak_reminder" && /notify_streak_reminder/i.test(error.message)) {
      return { error: "Falta aplicar la migración 047_streak_reminder.sql." };
    }
    if (/notify_/i.test(error.message)) {
      return { error: "Falta aplicar la migración 042_notification_preferences.sql." };
    }
    return { error: error.message };
  }
  revalidatePath("/ajustes");
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

