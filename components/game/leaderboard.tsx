import Link from "next/link";
import { FramedAvatar } from "@/components/game/framed-avatar";
import { rewardLabel } from "@/lib/game";
import { cn } from "@/lib/utils";
import type { GameLeaderRow } from "@/lib/types";

function profileHref(row: GameLeaderRow, userId: string) {
  if (row.playerId) return `/jugadores/${row.playerId}`;
  if (row.userId === userId) return "/perfil";
  return null;
}

export function GameLeaderboard({
  rows,
  userId,
}: {
  rows: GameLeaderRow[];
  userId: string;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-3xl border bg-card px-6 py-8 text-center shadow-card">
        <p className="text-base font-bold">La clasificación está vacía</p>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
          Acertar el equipo suma 1 punto. Si también aciertas el resultado, sumas 2.
        </p>
      </div>
    );
  }

  return (
    <ol className="space-y-2">
      {rows.map((row, index) => {
        const href = profileHref(row, userId);
        const identity = (
          <>
            <FramedAvatar name={row.name} url={row.avatarUrl} frameId={row.frame} size="sm" />
            <div className="min-w-0 flex-1">
              <p className={cn("truncate font-semibold leading-tight", href && "group-hover:underline")}>
                {row.name}
              </p>
              <p className="truncate text-[11px] text-muted-foreground">
                {rewardLabel(row.title) ? `${rewardLabel(row.title)} · ` : ""}
                {row.played} {row.played === 1 ? "pronóstico" : "pronósticos"}
              </p>
            </div>
          </>
        );
        return (
          <li
            key={row.userId}
            className={cn(
              "flex items-center gap-3 rounded-2xl border bg-card px-3 py-2.5",
              row.userId === userId && "border-orange-300 bg-orange-50/70 text-orange-950 dark:border-orange-400/40 dark:bg-orange-500/15 dark:text-foreground"
            )}
          >
            <span
              className={cn(
                "w-6 text-center text-sm font-black tabular-nums",
                index === 0 && "text-amber-600 dark:text-amber-300",
                index === 1 && "text-slate-500 dark:text-slate-300",
                index === 2 && "text-orange-700 dark:text-orange-300",
                index > 2 && "text-muted-foreground"
              )}
            >
              {index + 1}
            </span>
            {href ? (
              <Link
                href={href}
                aria-label={`Perfil de ${row.name}`}
                className="group flex min-w-0 flex-1 items-center gap-3 rounded-xl outline-offset-2"
              >
                {identity}
              </Link>
            ) : (
              <div className="flex min-w-0 flex-1 items-center gap-3">{identity}</div>
            )}
            <div className="text-right">
              <p className="text-sm font-bold tabular-nums">{row.points}</p>
              <p className="text-[11px] text-muted-foreground">
                {row.points === 1 ? "punto" : "puntos"}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
