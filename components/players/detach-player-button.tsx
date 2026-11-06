"use client";

import { useState } from "react";
import { toast } from "sonner";
import { detachClubPlayer } from "@/lib/actions/players";
import { Button } from "@/components/ui/button";

export function DetachPlayerButton({ playerId }: { playerId: string }) {
  const [pending, setPending] = useState(false);

  async function onDetach() {
    if (
      !confirm(
        "¿Quitar a esta persona de la plantilla? Seguirá existiendo su ficha y las estadísticas; solo dejará de aparecer en el equipo."
      )
    ) {
      return;
    }
    setPending(true);
    const result = await detachClubPlayer(playerId);
    setPending(false);
    if (result?.error) toast.error(result.error);
  }

  return (
    <Button variant="secondary" onClick={onDetach} disabled={pending} className="w-full">
      {pending ? "Quitando..." : "Quitar de la plantilla"}
    </Button>
  );
}
