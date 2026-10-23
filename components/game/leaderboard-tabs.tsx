"use client";

import { useState } from "react";
import { GameLeaderboard } from "@/components/game/leaderboard";
import { cn } from "@/lib/utils";
import type { GameLeaderRow } from "@/lib/types";

/** Clasificación general + mensual (mes natural en hora de Madrid). */
export function LeaderboardTabs({
  general,
  monthly,
  monthLabel,
  userId,
}: {
  general: GameLeaderRow[];
  monthly: GameLeaderRow[];
  monthLabel: string;
  userId: string;
}) {
  const [tab, setTab] = useState<"general" | "mes">("general");
  return (
    <div className="space-y-3">
      <div role="tablist" className="inline-flex rounded-full border bg-card p-1 shadow-card">
        {(
          [
            ["general", "General"],
            ["mes", "Este mes"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-semibold transition-colors",
              tab === id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "mes" ? (
        <p className="text-xs text-muted-foreground first-letter:uppercase">
          {monthLabel} · se reinicia el día 1 de cada mes
        </p>
      ) : null}
      <GameLeaderboard rows={tab === "mes" ? monthly : general} userId={userId} />
    </div>
  );
}
