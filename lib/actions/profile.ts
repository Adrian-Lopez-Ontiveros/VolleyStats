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
