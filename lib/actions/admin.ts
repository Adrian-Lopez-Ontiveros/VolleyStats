"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/types";

export async function setUserRole(userId: string, role: UserRole, coachedTeamId?: string | null) {
  const session = await requireAdmin();
  if (session.id === userId && role !== "admin") {
    return { error: "No puedes quitarte a ti mismo el rol de administrador" };
  }

  const supabase = await createClient();
  const nextCoached =
    role === "player" ? null : coachedTeamId === undefined ? undefined : coachedTeamId || null;
  const { error } = await supabase
    .from("profiles")
    .update({
      role,
      ...(nextCoached !== undefined ? { coached_team_id: nextCoached } : {}),
    })
    .eq("id", userId);

  if (error) {
    if (error.message.includes("invalid input value for enum")) {
      return { error: "Falta ejecutar en Supabase la migración 014_coach_tools.sql" };
    }
    if (/coached_team_id/i.test(error.message)) {
      return {
        error: "Falta ejecutar la migración supabase/migrations/028_coach_staff_and_dual_team.sql",
      };
    }
    return { error: error.message };
  }

  revalidatePath("/admin");
  revalidatePath("/perfil");
  return { success: true };
}

export async function setUserCoachedTeam(userId: string, teamId: string | null) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ coached_team_id: teamId })
    .eq("id", userId);

  if (error) {
    if (/coached_team_id/i.test(error.message)) {
      return {
        error: "Falta ejecutar la migración supabase/migrations/028_coach_staff_and_dual_team.sql",
      };
    }
    return { error: error.message };
  }

  revalidatePath("/admin");
  revalidatePath("/perfil");
  return { success: true };
}
