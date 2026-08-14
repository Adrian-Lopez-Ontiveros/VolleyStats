"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";

export async function updateOwnAvatar(avatarUrl: string) {
  const session = await requireUser();
  const supabase = await createClient();

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ avatar_url: avatarUrl })
    .eq("id", session.id);

  if (profileError) return { error: profileError.message };

  if (session.profile.player?.id) {
    const { error: playerError } = await supabase
      .from("players")
      .update({ avatar_url: avatarUrl })
      .eq("id", session.profile.player.id);

    if (playerError) return { error: playerError.message };
  }

  revalidatePath("/perfil");
  revalidatePath("/jugadores");
  return { success: true };
}

export async function updateOwnName(fullName: string) {
  const session = await requireUser();
  if (session.profile.role !== "admin") {
    return { error: "Solo un administrador puede editar el nombre" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: fullName.trim() })
    .eq("id", session.id);

  if (error) return { error: error.message };

  if (session.profile.player?.id) {
    await supabase
      .from("players")
      .update({ full_name: fullName.trim() })
      .eq("id", session.profile.player.id);
  }

  revalidatePath("/perfil");
  return { success: true };
}
