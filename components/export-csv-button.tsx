"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadCsv } from "@/lib/export-csv";

export function ExportCsvButton({
  filename,
  rows,
  label = "Exportar CSV",
}: {
  filename: string;
  rows: (string | number | null | undefined)[][];
  label?: string;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className="print-hidden"
      onClick={() => downloadCsv(filename, rows)}
    >
      <Download className="h-4 w-4" />
      {label}
    </Button>
  );
}
