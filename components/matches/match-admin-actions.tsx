"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { deleteMatch, setMatchStatus } from "@/lib/actions/matches";
import { Button } from "@/components/ui/button";
import type { MatchStatus } from "@/lib/types";

export function MatchAdminActions({
  matchId,
  status,
}: {
  matchId: string;
  status: MatchStatus;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function changeStatus(next: MatchStatus) {
    setPending(true);
    const result = await setMatchStatus(matchId, next);
    setPending(false);
    if (result.error) toast.error(result.error);
    else router.refresh();
  }

  async function onDelete() {
    if (!confirm("¿Eliminar este partido y todos sus puntos?")) return;
    setPending(true);
    const result = await deleteMatch(matchId);
    setPending(false);
    if (result?.error) toast.error(result.error);
  }

  return (
    <div className="grid gap-2">
      {status !== "finished" && status !== "cancelled" ? (
        <Button asChild variant="accent" className="w-full">
          <Link href={`/partidos/${matchId}/seguimiento`}>Seguimiento en vivo</Link>
        </Button>
      ) : null}
      {status === "scheduled" ? (
        <Button
          variant="secondary"
          disabled={pending}
          onClick={() => changeStatus("live")}
        >
          Iniciar partido
        </Button>
      ) : null}
      {status === "live" ? (
        <Button
          variant="secondary"
          disabled={pending}
          onClick={() => changeStatus("finished")}
        >
          Finalizar partido
        </Button>
      ) : null}
      {status !== "cancelled" && status === "scheduled" ? (
        <Button
          variant="outline"
          disabled={pending}
          onClick={() => changeStatus("cancelled")}
        >
          Cancelar partido
        </Button>
      ) : null}
      <Button asChild variant="outline">
        <Link href={`/partidos/${matchId}/resumen`}>Box score</Link>
      </Button>
      {status !== "cancelled" ? (
        <Button asChild variant="outline">
          <Link href={`/partidos/${matchId}/editar`}>Editar partido</Link>
        </Button>
      ) : null}
      <Button variant="destructive" disabled={pending} onClick={onDelete}>
        Eliminar partido
      </Button>
    </div>
  );
}
