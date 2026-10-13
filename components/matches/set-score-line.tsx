import { normalizeSetScores } from "@/lib/stats";
import { cn } from "@/lib/utils";

export function SetScoreLine({
  scores,
  className,
}: {
  scores: unknown;
  className?: string;
}) {
  const sets = normalizeSetScores(scores);
  if (sets.length === 0) return null;

  return (
    <div
      aria-label={`Sets: ${sets.map((set) => `${set.home} a ${set.away}`).join(", ")}`}
      className={cn("flex flex-wrap items-center justify-center gap-1.5", className)}
    >
      {sets.map((set, index) => {
        const homeWon = set.home > set.away;
        const awayWon = set.away > set.home;
        return (
          <span
            key={`${set.home}-${set.away}-${index}`}
            title={`Set ${index + 1}`}
            className="inline-flex items-center gap-1 rounded-full border border-border/80 bg-secondary px-1.5 py-1 text-[11px] font-bold leading-none tabular-nums text-foreground shadow-sm"
          >
            <span className="rounded-full bg-primary px-1 py-0.5 text-[9px] font-bold text-primary-foreground">
              {index + 1}
            </span>
            <span className={homeWon ? "text-foreground" : "text-muted-foreground"}>{set.home}</span>
            <span className="font-medium text-muted-foreground">–</span>
            <span className={awayWon ? "text-foreground" : "text-muted-foreground"}>{set.away}</span>
          </span>
        );
      })}
    </div>
  );
}
