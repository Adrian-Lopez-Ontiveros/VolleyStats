"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
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
  userId: z.string().uuid().optional().or(z.literal("")),
});

export async function createPlayer(formData: FormData) {
  await requireAdmin();
  const parsed = playerSchema.safeParse({
    fullName: formData.get("fullName"),
    teamId: formData.get("teamId") ?? "",
    jerseyNumber: formData.get("jerseyNumber") ?? "",
    position: formData.get("position") ?? "",
    userId: formData.get("userId") ?? "",
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
      user_id: parsed.data.userId || null,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  if (parsed.data.teamId && parsed.data.userId) {
    await supabase
      .from("profiles")
      .update({ team_id: parsed.data.teamId })
      .eq("id", parsed.data.userId);
  }

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
    userId: formData.get("userId") ?? "",
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
