"use client";

import { useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { updateOwnAvatar } from "@/lib/actions/profile";
import { initials } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function AvatarUpload({
  userId,
  name,
  url,
}: {
  userId: string;
  name: string;
  url?: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState(url ?? "");
  const [uploading, setUploading] = useState(false);

  async function onChange(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Selecciona una imagen");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      toast.error("La imagen no puede superar 3 MB");
      return;
    }

    setUploading(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${userId}/avatar-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("avatars").upload(path, file, {
        upsert: true,
        contentType: file.type,
      });
      if (error) throw error;

      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const result = await updateOwnAvatar(data.publicUrl);
      if (result.error) throw new Error(result.error);
      setPreview(data.publicUrl);
      toast.success("Foto de perfil actualizada");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo subir la foto");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="relative"
        disabled={uploading}
      >
        <Avatar className="h-24 w-24 ring-4 ring-secondary">
          <AvatarImage src={preview || undefined} alt={name} />
          <AvatarFallback className="text-2xl">{initials(name)}</AvatarFallback>
        </Avatar>
        <span className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full bg-accent text-accent-foreground shadow">
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Camera className="h-4 w-4" />
          )}
        </span>
      </button>
      <p className="text-xs text-muted-foreground">Toca para cambiar tu foto</p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => onChange(event.target.files?.[0])}
      />
    </div>
  );
}
