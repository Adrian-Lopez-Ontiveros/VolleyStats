"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { NEWS_BUCKET } from "@/lib/constants";
import { clampCoverFocus, clampCoverZoom } from "@/lib/news";
import { createClient } from "@/lib/supabase/server";

const newsSchema = z.object({
  title: z.string().trim().min(3, "El título es obligatorio").max(120),
  body: z.string().trim().min(10, "La descripción es demasiado corta").max(20000),
  coverUrl: z.string().url().optional().or(z.literal("")),
  coverPath: z.string().optional().or(z.literal("")),
  coverFocusX: z.coerce.number().min(0).max(100),
  coverFocusY: z.coerce.number().min(0).max(100),
  coverZoom: z.coerce.number().min(1).max(2.5),
  publishedAt: z.string().optional().or(z.literal("")),
});

function revalidateNews(id?: string) {
  revalidatePath("/noticias");
  if (id) {
    revalidatePath(`/noticias/${id}`);
    revalidatePath(`/noticias/${id}/editar`);
  }
}

function parsePublishedAt(value?: string) {
  if (!value) return new Date();
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

export async function createNews(formData: FormData) {
  const session = await requireAdmin();
  const parsed = newsSchema.safeParse({
    title: formData.get("title"),
    body: formData.get("body"),
    coverUrl: formData.get("coverUrl") ?? "",
    coverPath: formData.get("coverPath") ?? "",
    coverFocusX: formData.get("coverFocusX") ?? 50,
    coverFocusY: formData.get("coverFocusY") ?? 50,
    coverZoom: formData.get("coverZoom") ?? 1,
    publishedAt: formData.get("publishedAt") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos no válidos" };
  }

  const published = parsePublishedAt(parsed.data.publishedAt);
  if (!published) return { error: "La fecha no es válida" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("news")
    .insert({
      title: parsed.data.title,
      body: parsed.data.body,
      cover_url: parsed.data.coverUrl || null,
      cover_path: parsed.data.coverPath || null,
      cover_focus_x: clampCoverFocus(parsed.data.coverFocusX),
      cover_focus_y: clampCoverFocus(parsed.data.coverFocusY),
      cover_zoom: clampCoverZoom(parsed.data.coverZoom),
      published_at: published.toISOString(),
      created_by: session.id,
    })
    .select("id")
    .single();

  if (error || !data) {
    if (/news|cover_focus|cover_zoom/i.test(error?.message ?? "")) {
      return {
        error:
          "No se pudo guardar. Ejecuta las migraciones 018_news.sql y 019_news_cover_frame.sql en Supabase.",
      };
    }
    return { error: error?.message ?? "No se pudo publicar la noticia" };
  }

  revalidateNews(data.id);
  redirect(`/noticias/${data.id}`);
}

export async function updateNews(newsId: string, formData: FormData) {
  await requireAdmin();
  const parsed = newsSchema.safeParse({
    title: formData.get("title"),
    body: formData.get("body"),
    coverUrl: formData.get("coverUrl") ?? "",
    coverPath: formData.get("coverPath") ?? "",
    coverFocusX: formData.get("coverFocusX") ?? 50,
    coverFocusY: formData.get("coverFocusY") ?? 50,
    coverZoom: formData.get("coverZoom") ?? 1,
    publishedAt: formData.get("publishedAt") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos no válidos" };
  }

  const published = parsePublishedAt(parsed.data.publishedAt);
  if (!published) return { error: "La fecha no es válida" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("news")
    .update({
      title: parsed.data.title,
      body: parsed.data.body,
      cover_url: parsed.data.coverUrl || null,
      cover_path: parsed.data.coverPath || null,
      cover_focus_x: clampCoverFocus(parsed.data.coverFocusX),
      cover_focus_y: clampCoverFocus(parsed.data.coverFocusY),
      cover_zoom: clampCoverZoom(parsed.data.coverZoom),
      published_at: published.toISOString(),
    })
    .eq("id", newsId);

  if (error) {
    if (/cover_focus|cover_zoom/i.test(error.message)) {
      return {
        error:
          "No se pudo guardar el recorte. Ejecuta la migración 019_news_cover_frame.sql en Supabase.",
      };
    }
    return { error: error.message };
  }

  revalidateNews(newsId);
  redirect(`/noticias/${newsId}`);
}

export async function deleteNews(newsId: string) {
  await requireAdmin();
  const supabase = await createClient();
  const { data: current } = await supabase
    .from("news")
    .select("cover_path")
    .eq("id", newsId)
    .maybeSingle();

  if (current?.cover_path) {
    await supabase.storage.from(NEWS_BUCKET).remove([current.cover_path as string]);
  }

  const { error } = await supabase.from("news").delete().eq("id", newsId);
  if (error) return { error: error.message };

  revalidateNews(newsId);
  redirect("/noticias");
}
