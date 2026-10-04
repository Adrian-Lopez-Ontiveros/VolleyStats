"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getCategoryMeta } from "@/lib/categories";
import {
  prepareStoredLeagueRefresh,
  refreshStoredClubLeague,
  type FederationSyncReport,
} from "@/lib/actions/federation";

export function RefreshLeaguesButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onRefresh() {
    setPending(true);
    const toastId = toast.loading("Buscando tus ligas en FMVoley…");
    try {
      const listed = await prepareStoredLeagueRefresh();
      if ("error" in listed) {
        toast.error(listed.error, { id: toastId });
        return;
      }
      if (listed.targets.length === 0) {
        toast.error(listed.missing[0] ?? "No hay ligas enlazadas para actualizar.", { id: toastId });
        for (const missing of listed.missing.slice(1)) toast.error(missing);
        return;
      }

      const reports: FederationSyncReport[] = [];
      const failures = [...listed.missing];

      for (const league of listed.targets) {
        const label = getCategoryMeta(league.category).label;
        toast.loading(`Actualizando ${label}…`, { id: toastId });
        const result = await refreshStoredClubLeague(league.category, league.groupId);
        if ("error" in result) {
          failures.push(`${label}: ${result.error}`);
          continue;
        }
        reports.push({ ...result, groupName: league.path || result.groupName });
        for (const issue of result.errors) failures.push(issue);
      }

      if (reports.length > 0) {
        toast.success(summarizeRefresh(reports), {
          id: toastId,
          description: reports
            .map((report) => report.groupName)
            .filter(Boolean)
            .join("\n"),
        });
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
  const updated = reports.reduce((sum, report) => sum + report.matchesUpdated, 0);
  const skipped = reports.reduce((sum, report) => sum + report.matchesSkipped, 0);
  const removedTeams = reports.reduce((sum, report) => sum + report.teamsRemoved, 0);
  const leagues = reports.length === 1 ? "1 liga actualizada" : `${reports.length} ligas actualizadas`;
  const skippedText = skipped > 0 ? ` ${skipped} con estadísticas sin tocar.` : "";
  const removedText =
    removedTeams > 0 ? ` Quitados ${removedTeams} equipos que no eran de tus ligas.` : "";
  return `${leagues}: ${updated} partidos actualizados.${skippedText}${removedText}`;
}
