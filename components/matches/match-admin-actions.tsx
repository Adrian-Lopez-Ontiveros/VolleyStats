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
  canTrackLive = true,
  allowFinishedStats = false,
}: {
  matchId: string;
  status: MatchStatus;
  canTrackLive?: boolean;
  allowFinishedStats?: boolean;
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
    <div className="space-y-2">
      {canTrackLive && status !== "cancelled" && (status !== "finished" || allowFinishedStats) ? (
        <Button asChild variant="accent" className="w-full">
          <Link href={`/partidos/${matchId}/seguimiento`}>
            {status === "finished" ? "Apuntar estadísticas" : "Seguimiento en vivo"}
          </Link>
        </Button>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {canTrackLive && status === "scheduled" ? (
          <Button
            variant="secondary"
            className="min-w-[46%] flex-1"
            disabled={pending}
            onClick={() => changeStatus("live")}
          >
            Iniciar partido
          </Button>
        ) : null}
        {status === "live" ? (
          <Button
            variant="secondary"
            className="min-w-[46%] flex-1"
            disabled={pending}
            onClick={() => changeStatus("finished")}
          >
            Finalizar partido
          </Button>
        ) : null}
        {status !== "cancelled" && status === "scheduled" ? (
          <Button
            variant="outline"
            className="min-w-[46%] flex-1"
            disabled={pending}
            onClick={() => changeStatus("cancelled")}
          >
            Cancelar partido
          </Button>
        ) : null}
        {status !== "cancelled" ? (
          <Button asChild variant="outline" className="min-w-[46%] flex-1">
            <Link href={`/partidos/${matchId}/editar`}>Editar partido</Link>
          </Button>
        ) : null}
      </div>
      <Button
        variant="ghost"
        className="w-full text-rose-700 hover:bg-rose-500/10 hover:text-rose-800 dark:text-rose-300 dark:hover:text-rose-200"
        disabled={pending}
        onClick={onDelete}
      >
        Eliminar partido
      </Button>
    </div>
  );
}
