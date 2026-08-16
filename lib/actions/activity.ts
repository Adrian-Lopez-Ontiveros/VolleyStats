"use server";

import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function logMatchActivity(
  matchId: string | null,
  action: string,
  detail: string
) {
  try {
    const session = await requireAdmin();
    const supabase = await createClient();
    await supabase.from("activity_log").insert({
      match_id: matchId,
      actor_id: session.id,
      actor_name: session.profile.full_name,
      action,
      detail,
    });
  } catch {
    // El historial no debe bloquear la acción principal.
  }
}

export type ActivityEntry = {
  id: string;
  actor_name: string;
  action: string;
  detail: string | null;
  created_at: string;
};

export async function getMatchActivity(matchId: string): Promise<ActivityEntry[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("activity_log")
    .select("id, actor_name, action, detail, created_at")
    .eq("match_id", matchId)
    .order("created_at", { ascending: false })
    .limit(40);
  return (data ?? []) as ActivityEntry[];
}
