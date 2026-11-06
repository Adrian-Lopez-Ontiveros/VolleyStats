"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/types";
import { normalizeStoredPersonName } from "@/lib/utils";

async function syncTeamCoaches(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  teamIds: string[],
  primaryTeamId: string | null
) {
  const unique = [...new Set(teamIds.filter(Boolean))];
  const { error: delError } = await supabase.from("team_coaches").delete().eq("user_id", userId);
  if (delError) {
    if (/team_coaches/i.test(delError.message)) {
      return {
        error: "Falta ejecutar la migración supabase/migrations/053_coach_only_staff.sql",
      };
    }
    return { error: delError.message };
  }
  if (unique.length > 0) {
    const { error: insError } = await supabase.from("team_coaches").insert(
      unique.map((team_id) => ({ user_id: userId, team_id }))
    );
    if (insError) return { error: insError.message };
  }
  const { error: profileError } = await supabase
    .from("profiles")
    .update({ coached_team_id: primaryTeamId })
    .eq("id", userId);
  if (profileError) return { error: profileError.message };
  return { success: true as const };
}

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

  if (role === "player") {
    await supabase.from("team_coaches").delete().eq("user_id", userId);
  } else if (nextCoached) {
    await supabase.from("team_coaches").upsert(
      { user_id: userId, team_id: nextCoached },
      { onConflict: "user_id,team_id" }
    );
  }

  revalidatePath("/admin");
  revalidatePath("/perfil");
  return { success: true };
}

/** Compatibilidad: un solo equipo → actualiza coached_team_id y team_coaches. */
export async function setUserCoachedTeam(userId: string, teamId: string | null) {
  await requireAdmin();
  const supabase = await createClient();
  const result = await syncTeamCoaches(
    supabase,
    userId,
    teamId ? [teamId] : [],
    teamId
  );
  if (result.error) {
    if (/coached_team_id/i.test(result.error)) {
      return {
        error: "Falta ejecutar la migración supabase/migrations/028_coach_staff_and_dual_team.sql",
      };
    }
    return { error: result.error };
  }
  revalidatePath("/admin");
  revalidatePath("/perfil");
  return { success: true };
}

/** Varios equipos que entrena. El primero es el principal (coached_team_id). */
export async function setUserCoachedTeams(userId: string, teamIds: string[]) {
  await requireAdmin();
  const supabase = await createClient();
  const unique = [...new Set(teamIds.filter(Boolean))];
  const result = await syncTeamCoaches(
    supabase,
    userId,
    unique,
    unique[0] ?? null
  );
  if (result.error) return { error: result.error };
  revalidatePath("/admin");
  revalidatePath("/perfil");
  return { success: true };
}

export async function addStaffRosterMember(input: {
  fullName: string;
  email?: string | null;
  coachedTeamId?: string | null;
}) {
  await requireAdmin();
  const fullName = normalizeStoredPersonName(input.fullName);
  if (fullName.length < 3) return { error: "Introduce nombre y apellido del entrenador" };

  const supabase = await createClient();
  const { error } = await supabase.from("staff_roster").insert({
    full_name: fullName,
    email: input.email?.trim() || null,
    coached_team_id: input.coachedTeamId || null,
  });
  if (error) {
    if (/staff_roster/i.test(error.message)) {
      return {
        error: "Falta ejecutar la migración supabase/migrations/053_coach_only_staff.sql",
      };
    }
    return { error: error.message };
  }
  revalidatePath("/admin");
  return { success: true };
}

export async function removeStaffRosterMember(staffId: string) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("staff_roster").delete().eq("id", staffId);
  if (error) return { error: error.message };
  revalidatePath("/admin");
  return { success: true };
}
