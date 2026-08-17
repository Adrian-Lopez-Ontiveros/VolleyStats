"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { File, FileVideo, Image as ImageIcon, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { deleteTrainingFile, registerTrainingFile } from "@/lib/actions/trainings";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import {
  COACH_MEDIA_BUCKET,
  MAX_TRAINING_FILE_BYTES,
  MAX_TRAINING_VIDEO_BYTES,
} from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import { formatBytes, safeStorageName } from "@/lib/utils";
import type { TrainingFile } from "@/lib/types";

function fileIcon(mime: string | null) {
  if (mime?.startsWith("video/")) return FileVideo;
  if (mime?.startsWith("image/")) return ImageIcon;
  return File;
}

function isAllowedFile(file: File) {
  if (file.type.startsWith("video/")) return file.size <= MAX_TRAINING_VIDEO_BYTES;
  return file.size <= MAX_TRAINING_FILE_BYTES;
}

export function TrainingFiles({
  trainingId,
  files,
}: {
  trainingId: string;
  files: TrainingFile[];
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function onUpload(list: FileList | null) {
    if (!list?.length) return;
    const filesToUpload = Array.from(list);
    for (const file of filesToUpload) {
      if (!isAllowedFile(file)) {
        toast.error(
          file.type.startsWith("video/")
            ? "El vídeo no puede superar 50 MB"
            : "El archivo no puede superar 20 MB"
        );
        return;
      }
    }

    setUploading(true);
    try {
      const supabase = createClient();
      for (const file of filesToUpload) {
        const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
        const path = `trainings/${trainingId}/${Date.now()}-${safeStorageName(file.name) || `archivo.${ext}`}`;
        const { error } = await supabase.storage.from(COACH_MEDIA_BUCKET).upload(path, file, {
          contentType: file.type || undefined,
          upsert: false,
        });
        if (error) throw error;
        const { data } = supabase.storage.from(COACH_MEDIA_BUCKET).getPublicUrl(path);
        const result = await registerTrainingFile({
          trainingId,
          fileName: file.name,
          fileUrl: data.publicUrl,
          filePath: path,
          mimeType: file.type,
          fileSize: file.size,
        });
        if (result.error) throw new Error(result.error);
      }
      toast.success(filesToUpload.length === 1 ? "Archivo subido" : "Archivos subidos");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo subir el archivo");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function onDelete(fileId: string) {
    if (!confirm("¿Eliminar este archivo?")) return;
    setDeletingId(fileId);
    const result = await deleteTrainingFile(fileId);
    setDeletingId(null);
    if (result.error) toast.error(result.error);
    else {
      toast.success("Archivo eliminado");
      router.refresh();
    }
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Vídeos y archivos</h2>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          Subir
        </Button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="video/*,image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
          className="hidden"
          onChange={(event) => onUpload(event.target.files)}
        />
      </div>

      {files.length === 0 ? (
        <EmptyState
          icon={FileVideo}
          title="Sin archivos todavía"
          description="Sube vídeos de ejercicios, PDFs o cualquier material de la sesión."
        />
      ) : (
        <div className="space-y-3">
          {files.map((file) => {
            const Icon = fileIcon(file.mime_type);
            const isVideo = file.mime_type?.startsWith("video/");
            const isImage = file.mime_type?.startsWith("image/");
            return (
              <Card key={file.id}>
                <CardContent className="space-y-3 p-4">
                  {isVideo ? (
                    <video
                      src={file.file_url}
                      controls
                      playsInline
                      preload="metadata"
                      className="w-full rounded-xl bg-black"
                    />
                  ) : null}
                  {isImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={file.file_url}
                      alt={file.file_name}
                      className="max-h-64 w-full rounded-xl object-contain bg-secondary"
                    />
                  ) : null}
                  <div className="flex items-start justify-between gap-3">
                    <a
                      href={file.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex min-w-0 items-start gap-2"
                    >
                      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{file.file_name}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatBytes(file.file_size)}
                        </span>
                      </span>
                    </a>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="shrink-0 text-destructive"
                      disabled={deletingId === file.id}
                      onClick={() => onDelete(file.id)}
                      aria-label="Eliminar archivo"
                    >
                      {deletingId === file.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}
