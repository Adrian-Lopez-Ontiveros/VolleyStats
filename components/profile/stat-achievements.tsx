import { ChevronDown, Medal } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StatAchievementProgress } from "@/lib/achievements";

/** Insignias por estadísticas reales de la temporada, con progreso n/objetivo. Plegado por defecto. */
export function StatAchievements({ items }: { items: StatAchievementProgress[] }) {
  const done = items.filter((item) => item.done).length;
  return (
    <details className="group rounded-3xl border bg-card shadow-card">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
        <Medal className="h-5 w-5 shrink-0 text-orange-500" aria-hidden />
        <h2 className="min-w-0 flex-1 text-base font-semibold">Logros de la temporada</h2>
        <span className="shrink-0 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-orange-800 dark:bg-orange-500/20 dark:text-orange-200">
          {done}/{items.length} conseguidos
        </span>
        <ChevronDown
          className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
          aria-hidden
        />
      </summary>
      <div className="grid grid-cols-2 gap-2 px-3 pb-3 sm:grid-cols-4">
        {items.map((item) => {
          const current = Math.min(item.value, item.target);
          return (
            <div
              key={item.id}
              className={cn(
                "flex flex-col items-center rounded-2xl border p-3 text-center",
                item.done ? "bg-card shadow-card" : "bg-secondary/60"
              )}
            >
              <span
                className={cn(
                  "flex h-11 w-11 items-center justify-center rounded-full text-xl",
                  item.done
                    ? "bg-orange-100 ring-2 ring-orange-400 dark:bg-orange-500/20"
                    : "bg-muted grayscale opacity-60"
                )}
                aria-hidden
              >
                {item.emoji}
              </span>
              <p className="mt-2 text-sm font-semibold leading-tight">{item.label}</p>
              <p className="text-[11px] leading-snug text-muted-foreground">{item.description}</p>
              <div className="mt-2 flex w-full items-center gap-2">
                <div
                  className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={item.target}
                  aria-valuenow={current}
                  aria-label={`${item.label}: ${current} de ${item.target}`}
                >
                  <div
                    className={cn("h-full rounded-full", item.done ? "bg-orange-500" : "bg-orange-400/70")}
                    style={{ width: `${Math.round((current / item.target) * 100)}%` }}
                  />
                </div>
                <span className="shrink-0 text-[11px] font-semibold tabular-nums text-muted-foreground">
                  {current}/{item.target}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </details>
  );
}
