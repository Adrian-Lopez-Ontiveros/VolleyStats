"use client";

import { useState } from "react";
import { toast } from "sonner";
import { deleteNews } from "@/lib/actions/news";
import { Button } from "@/components/ui/button";

export function DeleteNewsButton({ newsId }: { newsId: string }) {
  const [pending, setPending] = useState(false);

  async function onDelete() {
    if (!confirm("¿Eliminar esta noticia? No se puede deshacer.")) return;
    setPending(true);
    const result = await deleteNews(newsId);
    setPending(false);
    if (result?.error) toast.error(result.error);
  }

  return (
    <Button variant="destructive" className="w-full" disabled={pending} onClick={onDelete}>
      {pending ? "Eliminando..." : "Eliminar noticia"}
    </Button>
  );
}
