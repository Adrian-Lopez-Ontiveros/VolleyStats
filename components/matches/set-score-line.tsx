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
    <p
      aria-label={`Sets: ${sets.map((set) => `${set.home} a ${set.away}`).join(", ")}`}
      className={cn(
        "flex flex-wrap justify-center gap-x-2 gap-y-0.5 text-xs font-semibold tabular-nums text-foreground",
        className
      )}
    >
      {sets.map((set, index) => (
        <span key={`${set.home}-${set.away}-${index}`}>
          {set.home}–{set.away}
        </span>
      ))}
    </p>
  );
}
