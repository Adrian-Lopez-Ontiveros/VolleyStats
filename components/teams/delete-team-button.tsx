"use client";

import { useState } from "react";
import { toast } from "sonner";
import { deleteTeam } from "@/lib/actions/teams";
import { Button } from "@/components/ui/button";

export function DeleteTeamButton({ teamId }: { teamId: string }) {
  const [pending, setPending] = useState(false);

  async function onDelete() {
    if (!confirm("¿Eliminar este equipo? Esta acción no se puede deshacer.")) return;
    setPending(true);
    const result = await deleteTeam(teamId);
    setPending(false);
    if (result?.error) toast.error(result.error);
  }

  return (
    <Button variant="destructive" onClick={onDelete} disabled={pending} className="w-full">
      {pending ? "Eliminando..." : "Eliminar equipo"}
    </Button>
  );
}
