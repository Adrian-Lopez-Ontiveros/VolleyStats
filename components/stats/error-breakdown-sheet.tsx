"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { ErrorBreakdownRow } from "@/lib/stats";

export function ErrorBreakdownSheet({
  open,
  onOpenChange,
  rows,
  total,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rows: ErrorBreakdownRow[];
  total: number;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Errores · {total}</SheetTitle>
          <SheetDescription>
            Desglose de errores propios según el filtro de fase activo.
          </SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pb-4">
          {rows.length === 0 ? (
            <p className="rounded-xl bg-secondary px-3 py-2 text-sm text-muted-foreground">
              Sin errores con este filtro.
            </p>
          ) : (
            rows.map((row) => (
              <div
                key={row.type}
                className="flex items-center justify-between gap-3 rounded-2xl border bg-card px-3 py-3"
              >
                <span className="min-w-0">
                  <span className="block font-semibold leading-tight">{row.label}</span>
                  {row.short ? (
                    <span className="block text-xs text-muted-foreground">{row.short}</span>
                  ) : null}
                </span>
                <span className="text-lg font-bold tabular-nums text-rose-700">{row.count}</span>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
