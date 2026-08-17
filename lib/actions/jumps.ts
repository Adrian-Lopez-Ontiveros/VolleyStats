"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireCoach } from "@/lib/auth";
import { COACH_MEDIA_BUCKET } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";

const jumpSchema = z.object({
  playerId: z.string().uuid("Selecciona un jugador"),
  trainingId: z.string().uuid().optional().or(z.literal("")),
  heightCm: z.number().min(1, "La altura debe ser mayor que 0").max(160, "La altura no es realista"),
  source: z.enum(["auto", "manual"]),
  videoUrl: z.string().optional().or(z.literal("")),
  videoPath: z.string().optional().or(z.literal("")),
  takeoffSec: z.number().optional().nullable(),
  landingSec: z.number().optional().nullable(),
  notes: z.string().optional().or(z.literal("")),
});

function revalidateJumps() {
  revalidatePath("/entrenador/saltos");
  revalidatePath("/entrenador");
}

export async function createJumpAnalysis(input: {
  playerId: string;
  trainingId?: string;
  heightCm: number;
  source: "auto" | "manual";
  videoUrl?: string;
  videoPath?: string;
  takeoffSec?: number | null;
  landingSec?: number | null;
  notes?: string;
}) {
  const session = await requireCoach();
  const parsed = jumpSchema.safeParse({
    playerId: input.playerId,
    trainingId: input.trainingId ?? "",
    heightCm: input.heightCm,
    source: input.source,
    videoUrl: input.videoUrl ?? "",
    videoPath: input.videoPath ?? "",
    takeoffSec: input.takeoffSec ?? null,
    landingSec: input.landingSec ?? null,
    notes: input.notes ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos no válidos" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("jump_analyses").insert({
    player_id: parsed.data.playerId,
    training_id: parsed.data.trainingId || null,
    height_cm: parsed.data.heightCm,
    source: parsed.data.source,
    video_url: parsed.data.videoUrl || null,
    video_path: parsed.data.videoPath || null,
    takeoff_sec: parsed.data.takeoffSec,
    landing_sec: parsed.data.landingSec,
    notes: parsed.data.notes?.trim() || null,
    created_by: session.id,
  });

  if (error) return { error: error.message };
  revalidateJumps();
  return { success: true };
}

export async function deleteJumpAnalysis(jumpId: string) {
  await requireCoach();
  const supabase = await createClient();
  const { data: jump, error: loadError } = await supabase
    .from("jump_analyses")
    .select("id, video_path")
    .eq("id", jumpId)
    .maybeSingle();

  if (loadError) return { error: loadError.message };
  if (!jump) return { error: "Análisis no encontrado" };

  if (jump.video_path) {
    await supabase.storage.from(COACH_MEDIA_BUCKET).remove([jump.video_path]);
  }

  const { error } = await supabase.from("jump_analyses").delete().eq("id", jumpId);
  if (error) return { error: error.message };
  revalidateJumps();
  return { success: true };
}
