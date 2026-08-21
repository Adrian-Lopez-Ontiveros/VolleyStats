"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { NewsCover } from "@/components/news/news-cover";
import { createNews, updateNews } from "@/lib/actions/news";
import { MAX_NEWS_COVER_BYTES, NEWS_BUCKET } from "@/lib/constants";
import {
  DEFAULT_COVER_FRAME,
  MAX_COVER_ZOOM,
  MIN_COVER_ZOOM,
  clampCoverZoom,
  coverFrameFromNews,
  type CoverFrame,
} from "@/lib/news";
import { createClient } from "@/lib/supabase/client";
import { toLocalDateTimeInput } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ClubNews } from "@/lib/types";

export function NewsForm({
  news,
  userId,
}: {
  news?: ClubNews;
  userId: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [coverUrl, setCoverUrl] = useState(news?.cover_url ?? "");
  const [coverPath, setCoverPath] = useState(news?.cover_path ?? "");
  const [coverFrame, setCoverFrame] = useState<CoverFrame>(coverFrameFromNews(news));

  async function onUpload(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Selecciona una imagen");
      return;
    }
    if (file.size > MAX_NEWS_COVER_BYTES) {
      toast.error("La portada no puede superar 4 MB");
      return;
    }

    setUploading(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${userId}/cover-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from(NEWS_BUCKET).upload(path, file, {
        upsert: true,
        contentType: file.type,
      });
      if (error) throw error;
      const { data } = supabase.storage.from(NEWS_BUCKET).getPublicUrl(path);
      setCoverUrl(data.publicUrl);
      setCoverPath(path);
      setCoverFrame(DEFAULT_COVER_FRAME);
      toast.success("Portada lista. Arrástrala para reencuadrar y guarda.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo subir la portada");
    } finally {
      setUploading(false);
    }
  }

  async function onSubmit(formData: FormData) {
    setPending(true);
    const result = news ? await updateNews(news.id, formData) : await createNews(formData);
    setPending(false);
    if (result?.error) toast.error(result.error);
  }

  return (
    <form action={onSubmit} className="space-y-5">
      <input type="hidden" name="coverUrl" value={coverUrl} />
      <input type="hidden" name="coverPath" value={coverPath} />
      <input type="hidden" name="coverFocusX" value={coverFrame.x} />
      <input type="hidden" name="coverFocusY" value={coverFrame.y} />
      <input type="hidden" name="coverZoom" value={coverFrame.zoom} />

      <div className="space-y-2">
        <Label>Portada</Label>
        {coverUrl ? (
          <NewsCover
            url={coverUrl}
            frame={coverFrame}
            interactive
            onFrameChange={setCoverFrame}
            className="aspect-[16/9] w-full rounded-3xl border"
          />
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="relative block w-full overflow-hidden rounded-3xl border bg-primary text-left"
          >
            <div className="flex aspect-[16/9] flex-col items-center justify-center gap-2 bg-gradient-to-br from-primary to-accent/80 text-primary-foreground">
              {uploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Camera className="h-6 w-6" />}
              <span className="text-sm font-semibold">
                {uploading ? "Subiendo..." : "Toca para subir la portada"}
              </span>
            </div>
          </button>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            {coverUrl ? "Cambiar imagen" : "Subir imagen"}
          </Button>
          {coverUrl ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setCoverUrl("");
                setCoverPath("");
                setCoverFrame(DEFAULT_COVER_FRAME);
              }}
            >
              Quitar portada
            </Button>
          ) : null}
        </div>
        {coverUrl ? (
          <div className="space-y-2 rounded-2xl border bg-card p-3">
            <p className="text-xs text-muted-foreground">
              Arrastra la imagen para moverla. Baja el tamaño para verla más pequeña; súbelo para recortar.
            </p>
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="coverZoom">Tamaño</Label>
              <span className="text-sm font-semibold tabular-nums">
                {Math.round(coverFrame.zoom * 100)}%
              </span>
            </div>
            <input
              id="coverZoom"
              type="range"
              min={MIN_COVER_ZOOM}
              max={MAX_COVER_ZOOM}
              step={0.05}
              value={coverFrame.zoom}
              onChange={(event) =>
                setCoverFrame((current) => ({
                  ...current,
                  zoom: clampCoverZoom(Number(event.target.value)),
                }))
              }
              className="stat-slider w-full"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setCoverFrame(DEFAULT_COVER_FRAME)}
            >
              Centrar recorte
            </Button>
          </div>
        ) : null}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => onUpload(event.target.files?.[0])}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="title">Título</Label>
        <Input
          id="title"
          name="title"
          required
          maxLength={120}
          defaultValue={news?.title}
          placeholder="Victoria en casa ante el rival"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="body">Descripción</Label>
        <Textarea
          id="body"
          name="body"
          required
          rows={10}
          defaultValue={news?.body}
          placeholder="Cuenta la noticia con todos los detalles…"
          className="min-h-[180px]"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="publishedAt">Fecha de publicación</Label>
        <Input
          id="publishedAt"
          name="publishedAt"
          type="datetime-local"
          defaultValue={toLocalDateTimeInput(news?.published_at ?? new Date())}
        />
      </div>

      <div className="flex gap-2">
        <Button type="button" variant="outline" className="flex-1" onClick={() => router.back()}>
          Cancelar
        </Button>
        <Button type="submit" variant="accent" className="flex-1" disabled={pending || uploading}>
          {pending ? "Guardando..." : news ? "Guardar cambios" : "Publicar"}
        </Button>
      </div>
    </form>
  );
}
