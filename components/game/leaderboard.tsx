import { Flame } from "lucide-react";
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
    return <p className="text-sm text-muted-foreground">Aún no hay clasificación.</p>;
  }

  return (
    <ol className="space-y-2">
      {rows.map((row, index) => (
        <li
          key={row.userId}
          className={cn(
            "flex items-center gap-3 rounded-2xl border bg-card px-3 py-2.5",
            row.userId === userId && "border-orange-300 bg-orange-50/70"
          )}
        >
          <span className="w-6 text-center text-sm font-black tabular-nums text-muted-foreground">
            {index + 1}
          </span>
          <FramedAvatar name={row.name} url={row.avatarUrl} frameId={row.frame} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold leading-tight">{row.name}</p>
            <p className="truncate text-[11px] text-muted-foreground">
              {rewardLabel(row.title) ?? `Nivel ${row.level}`} · {row.hits} aciertos
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold tabular-nums">{row.xp} XP</p>
            <p className="inline-flex items-center gap-0.5 text-[11px] text-orange-700">
              <Flame className="h-3 w-3" />
              {row.streak}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
