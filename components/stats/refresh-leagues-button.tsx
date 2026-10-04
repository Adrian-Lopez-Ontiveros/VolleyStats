"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getCategoryMeta } from "@/lib/categories";
import {
  listClubLeaguesForRefresh,
  refreshClubLeague,
  type FederationSyncReport,
} from "@/lib/actions/federation";

export function RefreshLeaguesButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onRefresh() {
    setPending(true);
    const toastId = toast.loading("Buscando ligas en FMVoley…");
    try {
      const listed = await listClubLeaguesForRefresh();
      if ("error" in listed) {
        toast.error(listed.error, { id: toastId });
        return;
      }
      if (listed.length === 0) {
        toast.error("FMVoley no tiene ligas del club para actualizar.", { id: toastId });
        return;
      }

      const reports: FederationSyncReport[] = [];
      const failures: string[] = [];

      for (const league of listed) {
        const label = getCategoryMeta(league.category).label;
        toast.loading(`Actualizando ${label}…`, { id: toastId });
        const result = await refreshClubLeague(league.groupId, league.category);
        if ("error" in result) {
          failures.push(`${label}: ${result.error}`);
          continue;
        }
        reports.push(result);
      }

      if (reports.length > 0) {
        toast.success(summarizeRefresh(reports), { id: toastId });
        router.refresh();
        for (const failure of failures) toast.error(failure);
        return;
      }

      toast.error(failures[0] ?? "No se actualizó ninguna liga.", { id: toastId });
      for (const failure of failures.slice(1)) toast.error(failure);
    } finally {
      setPending(false);
    }
  }

  return (
    <Button type="button" variant="secondary" size="sm" disabled={pending} onClick={() => void onRefresh()}>
      {pending ? <Loader2 className="animate-spin" /> : <RefreshCw />}
      {pending ? "Actualizando…" : "Actualizar"}
    </Button>
  );
}

function summarizeRefresh(reports: FederationSyncReport[]) {
  const created = reports.reduce((sum, report) => sum + report.matchesCreated, 0);
  const updated = reports.reduce((sum, report) => sum + report.matchesUpdated, 0);
  const skipped = reports.reduce((sum, report) => sum + report.matchesSkipped, 0);
  const leagues = reports.length === 1 ? "1 liga actualizada" : `${reports.length} ligas actualizadas`;
  const skippedText = skipped > 0 ? `, ${skipped} con estadísticas sin tocar` : "";
  return `${leagues}: ${created} partidos nuevos, ${updated} actualizados${skippedText}.`;
}
