"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, CheckCircle2, Loader2, X } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { submitFeedback } from "@/lib/actions/feedback";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const TYPES = [
  { value: "mejora", label: "Mejora" },
  { value: "falta_algo", label: "Falta algo" },
  { value: "idea", label: "Idea" },
  { value: "bug", label: "Bug" },
  { value: "otro", label: "Otro" },
] as const;
type FeedbackType = (typeof TYPES)[number]["value"];

const MAX_BYTES = 5 * 1024 * 1024;
const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/heic": "heic",
  "image/heif": "heif",
};

export function ContactSheet({
  open,
  onOpenChange,
  userId,
  defaultEmail,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  defaultEmail: string;
}) {
  const [type, setType] = useState<FeedbackType>("mejora");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState(defaultEmail);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function reset() {
    setType("mejora");
    setMessage("");
    setEmail(defaultEmail);
    setFile(null);
    setError(null);
    setSent(false);
  }

  function close() {
    onOpenChange(false);
    window.setTimeout(reset, 300);
  }

  function pickFile(next: File | undefined) {
    setError(null);
    if (!next) return;
    if (!next.type.startsWith("image/")) {
      setError("Solo se pueden adjuntar imágenes.");
      return;
    }
    if (next.size > MAX_BYTES) {
      setError("La imagen no puede pasar de 5 MB.");
      return;
    }
    setFile(next);
  }

  async function send() {
    const text = message.trim();
    if (!text) {
      setError("Escribe tu mensaje.");
      return;
    }
    setSending(true);
    setError(null);
    try {
      let screenshotPath = "";
      if (file) {
        const path = `${userId}/${crypto.randomUUID()}.${EXT[file.type] ?? "img"}`;
        const { error: uploadError } = await createClient()
          .storage.from("feedback-screenshots")
          .upload(path, file, { contentType: file.type, upsert: false });
        if (uploadError) throw new Error("No se pudo subir la imagen. Prueba sin captura.");
        screenshotPath = path;
      }
      const form = new FormData();
      form.set("type", type);
      form.set("message", text);
      form.set("contactEmail", email.trim());
      form.set("screenshotPath", screenshotPath);
      form.set("userAgent", navigator.userAgent);
      const result = await submitFeedback(form);
      if ("error" in result) throw new Error(result.error);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo enviar el mensaje.");
    } finally {
      setSending(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={(next) => (next ? onOpenChange(true) : close())}>
      <SheetContent className="mx-auto max-w-lg overflow-y-auto">
        {sent ? (
          <div className="flex flex-col items-center py-6 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-full bg-accent/10 text-accent">
              <CheckCircle2 className="h-7 w-7" />
            </span>
            <SheetTitle className="mt-4 text-xl font-bold">¡Gracias por tu mensaje!</SheetTitle>
            <SheetDescription className="mt-2 max-w-xs text-sm text-muted-foreground">
              Lo hemos recibido. Si nos dejaste tu email, te responderemos allí.
            </SheetDescription>
            <Button type="button" variant="accent" className="mt-6 w-full" onClick={close}>
              Volver a Ajustes
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <SheetHeader className="pr-8 text-left">
              <SheetTitle className="text-xl font-bold">Contacto y sugerencias</SheetTitle>
              <SheetDescription className="text-sm text-muted-foreground">
                Lo leemos todo. Gracias por ayudar a mejorar FuenlaStats.
              </SheetDescription>
            </SheetHeader>

            <div>
              <p className="mb-2 text-sm font-semibold">¿Qué nos quieres contar?</p>
              <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Tipo de mensaje">
                {TYPES.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    role="radio"
                    aria-checked={type === item.value}
                    onClick={() => setType(item.value)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors",
                      type === item.value
                        ? "border-primary bg-primary text-primary-foreground"
                        : "bg-card text-foreground"
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold">Mensaje</span>
              <Textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                maxLength={2000}
                rows={4}
                required
                placeholder="Cuéntanos qué mejorar, qué falta o qué ha fallado."
              />
            </label>

            <div>
              <p className="mb-2 text-sm font-semibold">
                Captura de pantalla <span className="font-normal text-muted-foreground">(opcional)</span>
              </p>
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  pickFile(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
              {preview ? (
                <div className="flex items-center gap-3 rounded-2xl border p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={preview} alt="Vista previa de la captura" className="h-16 w-16 rounded-xl object-cover" />
                  <p className="min-w-0 flex-1 truncate text-sm">{file?.name}</p>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setFile(null)}>
                    <X className="h-4 w-4" />
                    Quitar
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="flex w-full items-center gap-3 rounded-2xl border border-dashed p-3 text-sm text-muted-foreground"
                >
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-secondary text-foreground">
                    <Camera className="h-4 w-4" />
                  </span>
                  Adjuntar imagen
                </button>
              )}
            </div>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold">
                Email para responderte <span className="font-normal text-muted-foreground">(opcional)</span>
              </span>
              <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
            </label>

            {error ? <p className="text-sm font-medium text-destructive">{error}</p> : null}

            <Button
              type="button"
              variant="accent"
              className="h-12 w-full text-base"
              disabled={sending}
              onClick={() => void send()}
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {sending ? "Enviando..." : "Enviar"}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
