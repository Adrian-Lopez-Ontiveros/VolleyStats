"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { ErrorBreakdownRow } from "@/lib/error-breakdown";
import type { PointType } from "@/lib/types";
import { cn } from "@/lib/utils";

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
  const [openTypes, setOpenTypes] = useState<PointType[]>([]);

  function toggle(type: PointType) {
    setOpenTypes((current) =>
      current.includes(type) ? current.filter((item) => item !== type) : [...current, type]
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Errores · {total}</SheetTitle>
          <SheetDescription>Toca un tipo para ver los partidos.</SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pb-4">
          {rows.length === 0 ? (
            <p className="rounded-xl bg-secondary px-3 py-2 text-sm text-muted-foreground">
              Sin errores con este filtro.
            </p>
          ) : (
            rows.map((row) => {
              const expanded = openTypes.includes(row.type);
              return (
                <div key={row.type} className="rounded-2xl border bg-card px-3 py-3">
                  <button
                    type="button"
                    onClick={() => toggle(row.type)}
                    className="flex w-full items-center justify-between gap-3 text-left"
                    aria-expanded={expanded}
                  >
                    <span className="min-w-0">
                      <span className="block font-semibold leading-tight">{row.label}</span>
                      {row.short ? (
                        <span className="block text-xs text-muted-foreground">{row.short}</span>
                      ) : null}
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="text-lg font-bold tabular-nums text-rose-700">{row.count}</span>
                      <ChevronDown
                        className={cn("h-4 w-4 text-muted-foreground transition-transform", expanded && "rotate-180")}
                      />
                    </span>
                  </button>
                  {expanded ? (
                    <ul className="mt-2 space-y-1 border-t pt-2">
                      {row.matches.map((hit) => (
                        <li
                          key={hit.matchId ?? "none"}
                          className="flex items-center justify-between gap-3 text-sm"
                        >
                          {hit.matchId ? (
                            <Link href={`/partidos/${hit.matchId}`} className="min-w-0 truncate hover:underline">
                              {hit.label}
                            </Link>
                          ) : (
                            <span className="text-muted-foreground">{hit.label}</span>
                          )}
                          <span className="font-semibold tabular-nums">{hit.count}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
