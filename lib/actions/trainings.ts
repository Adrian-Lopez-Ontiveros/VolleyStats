"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireCoach } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { COACH_MEDIA_BUCKET } from "@/lib/constants";

const trainingSchema = z.object({
  name: z.string().trim().min(2, "El nombre es obligatorio"),
  scheduledAt: z.string().min(1, "La fecha es obligatoria"),
  teamId: z.string().uuid().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});

function revalidateTrainings(id?: string) {
  revalidatePath("/entrenador");
  if (id) {
    revalidatePath(`/entrenador/entrenamientos/${id}`);
    revalidatePath(`/entrenador/entrenamientos/${id}/editar`);
  }
  revalidatePath("/entrenador/saltos");
}

export async function createTraining(formData: FormData) {
  const session = await requireCoach();
  const parsed = trainingSchema.safeParse({
    name: formData.get("name"),
    scheduledAt: formData.get("scheduledAt"),
    teamId: formData.get("teamId") ?? "",
    notes: formData.get("notes") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos no válidos" };
  }

  const scheduled = new Date(parsed.data.scheduledAt);
  if (Number.isNaN(scheduled.getTime())) {
    return { error: "La fecha no es válida" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("trainings")
    .insert({
      name: parsed.data.name,
      scheduled_at: scheduled.toISOString(),
      team_id: parsed.data.teamId || null,
      notes: parsed.data.notes?.trim() || null,
      created_by: session.id,
    })
    .select("id")
    .single();

  if (error || !data) return { error: error?.message ?? "No se pudo crear el entrenamiento" };

  revalidateTrainings(data.id);
  redirect(`/entrenador/entrenamientos/${data.id}`);
}

export async function updateTraining(trainingId: string, formData: FormData) {
  await requireCoach();
  const parsed = trainingSchema.safeParse({
    name: formData.get("name"),
    scheduledAt: formData.get("scheduledAt"),
    teamId: formData.get("teamId") ?? "",
    notes: formData.get("notes") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos no válidos" };
  }

  const scheduled = new Date(parsed.data.scheduledAt);
  if (Number.isNaN(scheduled.getTime())) {
    return { error: "La fecha no es válida" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("trainings")
    .update({
      name: parsed.data.name,
      scheduled_at: scheduled.toISOString(),
      team_id: parsed.data.teamId || null,
      notes: parsed.data.notes?.trim() || null,
    })
    .eq("id", trainingId);

  if (error) return { error: error.message };

  revalidateTrainings(trainingId);
  redirect(`/entrenador/entrenamientos/${trainingId}`);
}

export async function deleteTraining(trainingId: string) {
  await requireCoach();
  const supabase = await createClient();

  const { data: files } = await supabase
    .from("training_files")
    .select("file_path")
    .eq("training_id", trainingId);

  const paths = ((files ?? []) as { file_path: string }[])
    .map((file) => file.file_path)
    .filter(Boolean);

  if (paths.length > 0) {
    await supabase.storage.from(COACH_MEDIA_BUCKET).remove(paths);
  }

  const { error } = await supabase.from("trainings").delete().eq("id", trainingId);
  if (error) return { error: error.message };

  revalidateTrainings(trainingId);
  redirect("/entrenador");
}

export async function registerTrainingFile(input: {
  trainingId: string;
  fileName: string;
  fileUrl: string;
  filePath: string;
  mimeType: string;
  fileSize: number;
}) {
  const session = await requireCoach();
  const supabase = await createClient();
  const { error } = await supabase.from("training_files").insert({
    training_id: input.trainingId,
    file_name: input.fileName,
    file_url: input.fileUrl,
    file_path: input.filePath,
    mime_type: input.mimeType || null,
    file_size: Number.isFinite(input.fileSize) ? input.fileSize : null,
    created_by: session.id,
  });
  if (error) return { error: error.message };
  revalidateTrainings(input.trainingId);
  return { success: true };
}

export async function deleteTrainingFile(fileId: string) {
  await requireCoach();
  const supabase = await createClient();
  const { data: file, error: loadError } = await supabase
    .from("training_files")
    .select("id, training_id, file_path")
    .eq("id", fileId)
    .maybeSingle();

  if (loadError) return { error: loadError.message };
  if (!file) return { error: "Archivo no encontrado" };

  if (file.file_path) {
    await supabase.storage.from(COACH_MEDIA_BUCKET).remove([file.file_path]);
  }

  const { error } = await supabase.from("training_files").delete().eq("id", fileId);
  if (error) return { error: error.message };

  revalidateTrainings(file.training_id);
  return { success: true };
}
