import { FramedAvatar } from "@/components/game/framed-avatar";
import { rewardLabel } from "@/lib/game";
import { cn } from "@/lib/utils";
import type { GameLeaderRow } from "@/lib/types";

export function GameLeaderboard({
  rows,
  userId,
}: {
  rows: GameLeaderRow[];
  userId: string;
}) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Cuando se resuelvan las predicciones, aquí saldrá la clasificación: 1 punto por acierto, 0
        si fallas.
      </p>
    );
  }

  return (
    <ol className="space-y-2">
      {rows.map((row, index) => (
        <li
          key={row.userId}
          className={cn(
            "flex items-center gap-3 rounded-2xl border bg-card px-3 py-2.5",
            row.userId === userId && "border-orange-300 bg-orange-50/70 text-orange-950 dark:border-orange-400/40 dark:bg-orange-500/15 dark:text-foreground"
          )}
        >
          <span className="w-6 text-center text-sm font-black tabular-nums text-muted-foreground">
            {index + 1}
          </span>
          <FramedAvatar name={row.name} url={row.avatarUrl} frameId={row.frame} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold leading-tight">{row.name}</p>
            <p className="truncate text-[11px] text-muted-foreground">
              {rewardLabel(row.title) ? `${rewardLabel(row.title)} · ` : ""}
              {row.played} {row.played === 1 ? "pronóstico" : "pronósticos"}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold tabular-nums">{row.points}</p>
            <p className="text-[11px] text-muted-foreground">
              {row.points === 1 ? "punto" : "puntos"}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
