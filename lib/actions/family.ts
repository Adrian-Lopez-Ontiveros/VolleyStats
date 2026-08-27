"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function linkGuardian(profileId: string, playerId: string) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("guardian_links").insert({
    profile_id: profileId,
    player_id: playerId,
  });
  if (error) {
    if (error.code === "23505") return { error: "Ese familiar ya está vinculado a este jugador" };
    return { error: error.message };
  }
  revalidatePath("/familia");
  revalidatePath("/admin");
  return { success: true };
}

export async function unlinkGuardian(linkId: string) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("guardian_links").delete().eq("id", linkId);
  if (error) return { error: error.message };
  revalidatePath("/familia");
  revalidatePath("/admin");
  return { success: true };
}

export async function setCallupStatus(
  callupId: string,
  status: "yes" | "no" | "pending"
) {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("match_callups")
    .update({
      status,
      responded_at: status === "pending" ? null : new Date().toISOString(),
    })
    .eq("id", callupId);
  if (error) return { error: error.message };
  revalidatePath("/familia");
  return { success: true };
}

export async function ensureCallups(playerId: string, teamId: string | null) {
  if (!teamId) return;
  const supabase = await createClient();
  const { data: matches } = await supabase
    .from("matches")
    .select("id")
    .in("status", ["scheduled", "live"])
    .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`);

  for (const match of matches ?? []) {
    await supabase.from("match_callups").upsert(
      {
        match_id: match.id,
        player_id: playerId,
        status: "pending",
      },
      { onConflict: "match_id,player_id", ignoreDuplicates: true }
    );
  }
}

export async function createPlayerFee(formData: FormData) {
  await requireAdmin();
  const playerId = String(formData.get("playerId") ?? "");
  const concept = String(formData.get("concept") ?? "").trim();
  const euros = Number(String(formData.get("amount") ?? "").replace(",", "."));
  const dueAt = String(formData.get("dueAt") ?? "") || null;

  if (!playerId || !concept) return { error: "Jugador y concepto son obligatorios" };
  if (!Number.isFinite(euros) || euros < 0) return { error: "Importe no válido" };

  const supabase = await createClient();
  const session = await requireAdmin();
  const { error } = await supabase.from("player_fees").insert({
    player_id: playerId,
    concept,
    amount_cents: Math.round(euros * 100),
    due_at: dueAt,
    created_by: session.id,
  });
  if (error) return { error: error.message };
  revalidatePath("/familia");
  return { success: true };
}

export async function markFeePaid(feeId: string) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from("player_fees")
    .update({ status: "paid", paid_at: new Date().toISOString() })
    .eq("id", feeId);
  if (error) return { error: error.message };
  revalidatePath("/familia");
  return { success: true };
}
