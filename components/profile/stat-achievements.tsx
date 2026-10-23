import { cn } from "@/lib/utils";
import type { StatAchievementProgress } from "@/lib/achievements";

/** Insignias por estadísticas reales de la temporada, con progreso n/objetivo. */
export function StatAchievements({ items }: { items: StatAchievementProgress[] }) {
  const done = items.filter((item) => item.done).length;
  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-semibold">Logros de la temporada</h2>
        <span className="text-xs font-semibold tabular-nums text-muted-foreground">
          {done}/{items.length}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
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
    </section>
  );
}
