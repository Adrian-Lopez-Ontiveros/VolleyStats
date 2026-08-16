"use client";

import { useState } from "react";
import { Download, Printer, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/lib/constants";

export function ShareBoxScore({
  captureId,
  fileName,
}: {
  captureId: string;
  fileName: string;
}) {
  const [pending, setPending] = useState(false);

  async function capturePng() {
    const node = document.getElementById(captureId);
    if (!node) throw new Error("No se encontró el resumen");
    const { toPng } = await import("html-to-image");
    return toPng(node, {
      cacheBust: true,
      pixelRatio: 2,
      backgroundColor: "#0B1F3A",
    });
  }

  async function onShare() {
    setPending(true);
    try {
      const dataUrl = await capturePng();
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `${fileName}.png`, { type: "image/png" });
      const payload = {
        files: [file],
        title: `${APP_NAME} · Box score`,
        text: "Resumen del partido",
      };

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share(payload);
        return;
      }

      downloadDataUrl(dataUrl, `${fileName}.png`);
      toast.success("Imagen guardada. Ya puedes adjuntarla en WhatsApp.");
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      toast.error("No se pudo generar la imagen. Prueba a imprimir o descargar.");
    } finally {
      setPending(false);
    }
  }

  async function onDownload() {
    setPending(true);
    try {
      const dataUrl = await capturePng();
      downloadDataUrl(dataUrl, `${fileName}.png`);
    } catch {
      toast.error("No se pudo descargar la imagen.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="print-hidden grid grid-cols-3 gap-2">
      <Button variant="accent" disabled={pending} onClick={onShare}>
        <Share2 className="h-4 w-4" />
        {pending ? "..." : "Compartir"}
      </Button>
      <Button variant="outline" disabled={pending} onClick={onDownload}>
        <Download className="h-4 w-4" />
        Imagen
      </Button>
      <Button variant="outline" onClick={() => window.print()}>
        <Printer className="h-4 w-4" />
        PDF
      </Button>
    </div>
  );
}

function downloadDataUrl(dataUrl: string, name: string) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = name;
  link.click();
}
