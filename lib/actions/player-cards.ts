"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { canManagePlayerCard, clampCardStat } from "@/lib/player-card";
import { createClient } from "@/lib/supabase/server";
import type { PlayerPosition } from "@/lib/types";

const statField = z.coerce.number().int().min(1).max(99);

const cardSchema = z.object({
  photoUrl: z.string().url().optional().or(z.literal("")),
  position: z
    .enum(["opuesto", "central", "receptor", "colocador", "libero", "universal", ""])
    .optional(),
  jump: statField,
  attack: statField,
  block: statField,
  serve: statField,
  reception: statField,
  defense: statField,
  ratingOverride: z.string().optional().or(z.literal("")),
});

export async function upsertPlayerCard(playerId: string, formData: FormData) {
  const session = await requireUser();
  if (!canManagePlayerCard(session, playerId)) {
    return { error: "No puedes editar esta carta" };
  }

  const parsed = cardSchema.safeParse({
    photoUrl: formData.get("photoUrl") ?? "",
    position: formData.get("position") ?? "",
    jump: formData.get("jump"),
    attack: formData.get("attack"),
    block: formData.get("block"),
    serve: formData.get("serve"),
    reception: formData.get("reception"),
    defense: formData.get("defense"),
    ratingOverride: formData.get("ratingOverride") ?? "",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos no válidos" };
  }

  let ratingOverride: number | null = null;
  if (parsed.data.ratingOverride) {
    const value = Number(parsed.data.ratingOverride);
    if (Number.isNaN(value) || value < 1 || value > 99) {
      return { error: "El rating debe estar entre 1 y 99" };
    }
    ratingOverride = clampCardStat(value);
  }

  const supabase = await createClient();
  const { data: player, error: playerError } = await supabase
    .from("players")
    .select("id")
    .eq("id", playerId)
    .maybeSingle();

  if (playerError) return { error: playerError.message };
  if (!player) return { error: "Jugador no encontrado" };

  const { error } = await supabase.from("player_cards").upsert(
    {
      player_id: playerId,
      photo_url: parsed.data.photoUrl || null,
      position: (parsed.data.position || null) as PlayerPosition | null,
      jump: parsed.data.jump,
      attack: parsed.data.attack,
      block: parsed.data.block,
      serve: parsed.data.serve,
      reception: parsed.data.reception,
      defense: parsed.data.defense,
      rating_override: ratingOverride,
    },
    { onConflict: "player_id" }
  );

  if (error) {
    if (error.message.toLowerCase().includes("player_cards")) {
      return {
        error:
          "No se pudo guardar. Ejecuta la migración supabase/migrations/015_player_cards.sql en el SQL Editor de Supabase.",
      };
    }
    return { error: error.message };
  }

  revalidatePath("/perfil");
  revalidatePath("/perfil/carta");
  revalidatePath("/jugadores");
  revalidatePath(`/jugadores/${playerId}`);
  revalidatePath(`/jugadores/${playerId}/carta`);
  return { success: true };
}
