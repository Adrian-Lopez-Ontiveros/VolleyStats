"use server";

import { z } from "zod";
import { APP_VERSION } from "@/lib/app-version";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const MAX_PER_HOUR = 5;

const feedbackSchema = z.object({
  type: z.enum(["mejora", "falta_algo", "idea", "bug", "otro"]),
  message: z
    .string()
    .trim()
    .min(1, "Escribe tu mensaje")
    .max(2000, "El mensaje no puede pasar de 2000 caracteres"),
  contactEmail: z
    .string()
    .trim()
    .email("El email no es válido")
    .max(254)
    .optional()
    .or(z.literal("")),
});

export async function submitFeedback(
  formData: FormData
): Promise<{ success: true } | { error: string }> {
  const session = await requireUser();
  const parsed = feedbackSchema.safeParse({
    type: formData.get("type"),
    message: formData.get("message") ?? "",
    contactEmail: formData.get("contactEmail") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos no válidos" };
  }

  const supabase = await createClient();

  // Límite: máximo 5 envíos por hora y usuario.
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count, error: countError } = await supabase
    .from("feedback")
    .select("id", { count: "exact", head: true })
    .eq("user_id", session.id)
    .gte("created_at", since);
  if (countError) {
    if (/feedback/i.test(countError.message)) {
      return { error: "Falta aplicar la migración 043_feedback.sql." };
    }
    return { error: countError.message };
  }
  if ((count ?? 0) >= MAX_PER_HOUR) {
    return { error: "Has enviado muchos mensajes seguidos. Prueba de nuevo en un rato." };
  }

  // La captura la sube el navegador directamente a feedback-screenshots/{uid}/... (las
  // políticas del bucket solo dejan escribir en la carpeta propia). Aquí solo se valida la ruta.
  const rawPath = String(formData.get("screenshotPath") ?? "").trim();
  let screenshotPath: string | null = null;
  if (rawPath) {
    const pattern = new RegExp(`^${session.id}/[0-9a-f-]{36}\\.(jpg|png|webp|gif|heic|heif|img)$`);
    if (!pattern.test(rawPath)) return { error: "La captura no es válida." };
    screenshotPath = rawPath;
  }

  const userAgent = String(formData.get("userAgent") ?? "").slice(0, 400) || null;
  const { error } = await supabase.from("feedback").insert({
    user_id: session.id,
    type: parsed.data.type,
    message: parsed.data.message,
    contact_email: parsed.data.contactEmail || null,
    screenshot_path: screenshotPath,
    user_agent: userAgent,
    app_version: APP_VERSION,
  });
  if (error) return { error: "No se pudo enviar el mensaje. Inténtalo de nuevo." };
  return { success: true };
}
