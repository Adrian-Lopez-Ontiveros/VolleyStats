"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { NEWS_REACTION_EMOJIS } from "@/lib/news-social";
import { createClient } from "@/lib/supabase/server";

const MISSING_MIGRATION = "Falta aplicar la migración 045_news_comments_reactions.sql.";

function isMissingTable(message?: string) {
  return /news_(comments|reactions)/i.test(message ?? "") &&
    /(does not exist|schema cache|relation)/i.test(message ?? "");
}

const commentSchema = z.string().trim().min(1, "Escribe algo").max(1000, "Máximo 1000 caracteres");

export async function addNewsComment(newsId: string, body: string) {
  const session = await requireUser();
  const parsed = commentSchema.safeParse(body);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Comentario no válido" };
  const supabase = await createClient();
  const { error } = await supabase
    .from("news_comments")
    .insert({ news_id: newsId, user_id: session.id, body: parsed.data });
  if (error) return { error: isMissingTable(error.message) ? MISSING_MIGRATION : error.message };
  revalidatePath(`/noticias/${newsId}`);
  return { success: true };
}

export async function updateNewsComment(newsId: string, commentId: string, body: string) {
  const session = await requireUser();
  const parsed = commentSchema.safeParse(body);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Comentario no válido" };
  const supabase = await createClient();
  // RLS: solo el autor puede editar su comentario.
  const { error } = await supabase
    .from("news_comments")
    .update({ body: parsed.data })
    .eq("id", commentId)
    .eq("user_id", session.id);
  if (error) return { error: error.message };
  revalidatePath(`/noticias/${newsId}`);
  return { success: true };
}

export async function deleteNewsComment(newsId: string, commentId: string) {
  await requireUser();
  const supabase = await createClient();
  // RLS decide: autor del comentario, admin o autor de la noticia.
  const { data, error } = await supabase
    .from("news_comments")
    .delete()
    .eq("id", commentId)
    .select("id");
  if (error) return { error: error.message };
  if (!data || data.length === 0) return { error: "No puedes borrar este comentario" };
  revalidatePath(`/noticias/${newsId}`);
  return { success: true };
}

export async function toggleNewsReaction(newsId: string, emoji: string, on: boolean) {
  const session = await requireUser();
  if (!(NEWS_REACTION_EMOJIS as readonly string[]).includes(emoji)) {
    return { error: "Reacción no válida" };
  }
  const supabase = await createClient();
  const { error } = on
    ? await supabase
        .from("news_reactions")
        .upsert(
          { news_id: newsId, user_id: session.id, emoji },
          { onConflict: "news_id,user_id,emoji", ignoreDuplicates: true }
        )
    : await supabase
        .from("news_reactions")
        .delete()
        .eq("news_id", newsId)
        .eq("user_id", session.id)
        .eq("emoji", emoji);
  if (error) return { error: isMissingTable(error.message) ? MISSING_MIGRATION : error.message };
  revalidatePath(`/noticias/${newsId}`);
  return { success: true };
}
