"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { PlayerPosition } from "@/lib/types";
import { normalizeStoredPersonName } from "@/lib/utils";

const playerSchema = z.object({
  fullName: z.string().min(2, "El nombre es obligatorio"),
  teamId: z.string().uuid().optional().or(z.literal("")),
  jerseyNumber: z.string().optional().or(z.literal("")),
  position: z
    .enum(["opuesto", "central", "receptor", "colocador", "libero", "universal", ""])
    .optional(),
});

export async function createPlayer(formData: FormData) {
  await requireAdmin();
  const parsed = playerSchema.safeParse({
    fullName: formData.get("fullName"),
    teamId: formData.get("teamId") ?? "",
    jerseyNumber: formData.get("jerseyNumber") ?? "",
    position: formData.get("position") ?? "",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos no válidos" };
  }

  const jersey = parsed.data.jerseyNumber
    ? Number(parsed.data.jerseyNumber)
    : null;

  if (jersey !== null && (Number.isNaN(jersey) || jersey < 0 || jersey > 99)) {
    return { error: "El dorsal debe estar entre 0 y 99" };
  }

  const fullName = normalizeStoredPersonName(parsed.data.fullName);
  if (fullName.length < 2) {
    return { error: "El nombre es obligatorio" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("players")
    .insert({
      full_name: fullName,
      team_id: parsed.data.teamId || null,
      jersey_number: jersey,
      position: (parsed.data.position || null) as PlayerPosition | null,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/jugadores");
  revalidatePath("/equipos");
  if (parsed.data.teamId) revalidatePath(`/equipos/${parsed.data.teamId}`);
  redirect(`/jugadores/${data.id}`);
}

export async function updatePlayer(playerId: string, formData: FormData) {
  await requireAdmin();
  const parsed = playerSchema.safeParse({
    fullName: formData.get("fullName"),
    teamId: formData.get("teamId") ?? "",
    jerseyNumber: formData.get("jerseyNumber") ?? "",
    position: formData.get("position") ?? "",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos no válidos" };
  }

  const jersey = parsed.data.jerseyNumber
    ? Number(parsed.data.jerseyNumber)
    : null;

  if (jersey !== null && (Number.isNaN(jersey) || jersey < 0 || jersey > 99)) {
    return { error: "El dorsal debe estar entre 0 y 99" };
  }

  const fullName = normalizeStoredPersonName(parsed.data.fullName);
  if (fullName.length < 2) {
    return { error: "El nombre es obligatorio" };
  }

  const supabase = await createClient();
  const { data: current } = await supabase
    .from("players")
    .select("user_id")
    .eq("id", playerId)
    .single();

  const { error } = await supabase
    .from("players")
    .update({
      full_name: fullName,
      team_id: parsed.data.teamId || null,
      jersey_number: jersey,
      position: (parsed.data.position || null) as PlayerPosition | null,
    })
    .eq("id", playerId);

  if (error) return { error: error.message };

  const linkedUser = current?.user_id as string | null;
  if (linkedUser) {
    await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        team_id: parsed.data.teamId || null,
      })
      .eq("id", linkedUser);
  }

  revalidatePath("/jugadores");
  revalidatePath(`/jugadores/${playerId}`);
  revalidatePath("/equipos");
  if (parsed.data.teamId) revalidatePath(`/equipos/${parsed.data.teamId}`);
  redirect(`/jugadores/${playerId}`);
}

export async function setPlayerJersey(
  playerId: string,
  jerseyNumber: number | null
): Promise<
  | { error: string }
  | { success: true; xpGained: number; leveledUp: boolean; level: number | null }
> {
  const session = await requireUser();
  const isAdmin = session.profile.role === "admin";
  const ownPlayerId = session.profile.player?.id ?? null;
  if (!isAdmin && ownPlayerId !== playerId) {
    return { error: "Solo puedes editar tu dorsal." };
  }

  if (
    jerseyNumber !== null &&
    (!Number.isInteger(jerseyNumber) || jerseyNumber < 0 || jerseyNumber > 99)
  ) {
    return { error: "El dorsal debe estar entre 0 y 99." };
  }

  const supabase = await createClient();
  const { data: player, error: playerError } = await supabase
    .from("players")
    .select("id, user_id, team_id")
    .eq("id", playerId)
    .maybeSingle();

  if (playerError) return { error: playerError.message };
  if (!player) return { error: "Jugador no encontrado" };

  const { error } = await supabase
    .from("players")
    .update({ jersey_number: jerseyNumber })
    .eq("id", playerId);

  if (error) {
    if (/protect_player_updates|jersey_number/i.test(error.message) && !isAdmin) {
      return {
        error:
          "No se pudo guardar el dorsal. Ejecuta la migración supabase/migrations/027_jersey_xp.sql.",
      };
    }
    return { error: error.message };
  }

  let xpGained = 0;
  let leveledUp = false;
  let level: number | null = null;
  if (ownPlayerId === playerId && jerseyNumber !== null) {
    const { data, error: xpError } = await supabase.rpc("game_claim_jersey_xp");
    if (!xpError && data && typeof data === "object") {
      const row = data as Record<string, unknown>;
      xpGained = Number(row.xp_gained ?? 0);
      leveledUp = Boolean(row.leveled_up);
      const parsedLevel = Number(row.level);
      level = Number.isFinite(parsedLevel) ? parsedLevel : null;
    }
  }

  revalidatePath("/equipos");
  revalidatePath("/jugadores");
  revalidatePath(`/jugadores/${playerId}`);
  revalidatePath("/perfil");
  if (player.team_id) revalidatePath(`/equipos/${player.team_id}`);

  return { success: true, xpGained, leveledUp, level };
}

export async function deletePlayer(playerId: string) {
  await requireAdmin();
  const supabase = await createClient();
  const { data: current } = await supabase
    .from("players")
    .select("team_id")
    .eq("id", playerId)
    .maybeSingle();

  const { error } = await supabase.from("players").delete().eq("id", playerId);
  if (error) return { error: error.message };

  revalidatePath("/jugadores");
  revalidatePath("/equipos");
  if (current?.team_id) {
    revalidatePath(`/equipos/${current.team_id}`);
    redirect(`/equipos/${current.team_id}`);
  }
  redirect("/equipos");
}
