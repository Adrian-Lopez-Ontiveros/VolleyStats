"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/types";

export async function setUserRole(userId: string, role: UserRole) {
  const session = await requireAdmin();
  if (session.id === userId && role !== "admin") {
    return { error: "No puedes quitarte a ti mismo el rol de administrador" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ role })
    .eq("id", userId);

  if (error) {
    if (error.message.includes("invalid input value for enum")) {
      return { error: "Falta ejecutar en Supabase la migración 014_coach_tools.sql" };
    }
    return { error: error.message };
  }

  revalidatePath("/admin");
  return { success: true };
}
