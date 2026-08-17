"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireCoach } from "@/lib/auth";
import { parseBoard, type BoardState } from "@/lib/board";
import { createClient } from "@/lib/supabase/server";

const playSchema = z.object({
  name: z.string().trim().min(2, "El nombre de la jugada es obligatorio"),
  notes: z.string().optional().or(z.literal("")),
  teamId: z.string().uuid().optional().or(z.literal("")),
  trainingId: z.string().uuid().optional().or(z.literal("")),
});

function revalidatePlays(id?: string, trainingId?: string | null) {
  revalidatePath("/entrenador/pizarra");
  if (id) revalidatePath(`/entrenador/pizarra/${id}`);
  if (trainingId) revalidatePath(`/entrenador/entrenamientos/${trainingId}`);
  revalidatePath("/entrenador");
}

export async function saveTacticalPlay(input: {
  id?: string;
  name: string;
  notes?: string;
  teamId?: string;
  trainingId?: string;
  board: BoardState;
}) {
  const session = await requireCoach();
  const parsed = playSchema.safeParse({
    name: input.name,
    notes: input.notes ?? "",
    teamId: input.teamId ?? "",
    trainingId: input.trainingId ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos no válidos" };
  }

  const board = parseBoard(input.board);
  const supabase = await createClient();
  const trainingId = parsed.data.trainingId || null;

  if (input.id) {
    const { error } = await supabase
      .from("tactical_plays")
      .update({
        name: parsed.data.name,
        notes: parsed.data.notes?.trim() || null,
        team_id: parsed.data.teamId || null,
        training_id: trainingId,
        board,
      })
      .eq("id", input.id);
    if (error) {
      if (/training_id/i.test(error.message)) {
        return {
          error:
            "No se pudo vincular el entrenamiento. Ejecuta la migración 017_tactical_play_training.sql en Supabase.",
        };
      }
      return { error: error.message };
    }
    revalidatePlays(input.id, trainingId);
    return { id: input.id };
  }

  const { data, error } = await supabase
    .from("tactical_plays")
    .insert({
      name: parsed.data.name,
      notes: parsed.data.notes?.trim() || null,
      team_id: parsed.data.teamId || null,
      training_id: trainingId,
      board,
      created_by: session.id,
    })
    .select("id")
    .single();

  if (error || !data) {
    if (error && /training_id/i.test(error.message)) {
      return {
        error:
          "No se pudo vincular el entrenamiento. Ejecuta la migración 017_tactical_play_training.sql en Supabase.",
      };
    }
    return { error: error?.message ?? "No se pudo guardar la jugada" };
  }
  revalidatePlays(data.id, trainingId);
  return { id: data.id as string };
}

export async function deleteTacticalPlay(playId: string) {
  await requireCoach();
  const supabase = await createClient();
  const { data: current } = await supabase
    .from("tactical_plays")
    .select("training_id")
    .eq("id", playId)
    .maybeSingle();
  const { error } = await supabase.from("tactical_plays").delete().eq("id", playId);
  if (error) return { error: error.message };
  revalidatePlays(playId, (current?.training_id as string | null) ?? null);
  return { success: true };
}
