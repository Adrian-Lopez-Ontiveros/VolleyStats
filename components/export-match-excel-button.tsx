"use client";

import { useState } from "react";
import { FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { MatchExcelRosterPlayer } from "@/lib/match-excel-report";
import type { SetterStarts } from "@/lib/volleyball-stats";
import type { MatchEventWithPlayer, MatchWithTeams } from "@/lib/types";

export function ExportMatchExcelButton({
  match,
  events,
  roster = [],
  setterStarts,
}: {
  match: MatchWithTeams;
  events: MatchEventWithPlayer[];
  roster?: MatchExcelRosterPlayer[];
  setterStarts?: SetterStarts;
}) {
  const [busy, setBusy] = useState(false);

  async function onExport() {
    if (busy) return;
    setBusy(true);
    try {
      const [{ buildMatchExcelReport }, { downloadMatchExcel }] = await Promise.all([
        import("@/lib/match-excel-report"),
        import("@/lib/export-match-xlsx"),
      ]);
      await downloadMatchExcel(buildMatchExcelReport(match, events, roster, setterStarts));
    } catch (error) {
      console.error(error);
      toast.error("No se pudo generar el Excel. Inténtalo de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className="print-hidden"
      disabled={busy}
      onClick={onExport}
    >
      <FileSpreadsheet className="h-4 w-4" />
      {busy ? "Generando…" : "Exportar Excel"}
    </Button>
  );
}
