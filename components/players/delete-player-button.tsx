"use client";

import { useState } from "react";
import { toast } from "sonner";
import { deletePlayer } from "@/lib/actions/players";
import { Button } from "@/components/ui/button";

export function DeletePlayerButton({ playerId }: { playerId: string }) {
  const [pending, setPending] = useState(false);

  async function onDelete() {
    if (!confirm("¿Eliminar este jugador? El historial de puntos se conservará sin nombre.")) {
      return;
    }
    setPending(true);
    const result = await deletePlayer(playerId);
    setPending(false);
    if (result?.error) toast.error(result.error);
  }

  return (
    <Button variant="destructive" onClick={onDelete} disabled={pending} className="w-full">
      {pending ? "Eliminando..." : "Eliminar jugador"}
    </Button>
  );
}
