import { memo } from "react";
import Link from "next/link";
import { POINT_TYPE_META } from "@/lib/constants";
import { formatJersey } from "@/lib/utils";
import { annotateEventScores } from "@/lib/volleyball";
import type { MatchEventWithPlayer, MatchSubstitution } from "@/lib/types";

type HistoryItem =
  | {
      kind: "point";
      id: string;
      created_at: string;
      set_number: number;
      event: ReturnType<typeof annotateEventScores<MatchEventWithPlayer>>[number];
    }
  | {
      kind: "substitution";
      id: string;
      created_at: string;
      set_number: number;
      sub: MatchSubstitution;
    };

function playerName(
  player?: { full_name: string; jersey_number: number | null } | null
) {
  if (!player) return "jugador";
  return `${player.full_name}${player.jersey_number != null ? ` ${formatJersey(player.jersey_number)}` : ""}`;
}

export const PointHistory = memo(function PointHistory({
  events,
  substitutions = [],
  homeTeamId,
  limit,
  playerLinks = true,
}: {
  events: MatchEventWithPlayer[];
  substitutions?: MatchSubstitution[];
  homeTeamId: string;
  limit?: number;
  playerLinks?: boolean;
}) {
  const scored = annotateEventScores(events, homeTeamId);
  const items: HistoryItem[] = [
    ...scored.map((event) => ({
      kind: "point" as const,
      id: event.id,
      created_at: event.created_at,
      set_number: event.set_number,
      event,
    })),
    ...substitutions.map((sub) => ({
      kind: "substitution" as const,
      id: sub.id,
      created_at: sub.created_at,
      set_number: sub.set_number ?? 1,
      sub,
    })),
  ].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  const visible = limit ? [...items].reverse().slice(0, limit) : [...items].reverse();
  const groups = new Map<number, HistoryItem[]>();
  for (const item of visible) {
    const list = groups.get(item.set_number);
    if (list) list.push(item);
    else groups.set(item.set_number, [item]);
  }
  const orderedGroups = [...groups.entries()].sort((a, b) => b[0] - a[0]);

  if (visible.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Todavía no hay puntos ni cambios en este partido.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {orderedGroups.map(([setNumber, groupItems]) => (
        <section key={setNumber} className="space-y-2">
          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <h3 className="rounded-full bg-primary px-3 py-1 text-xs font-bold uppercase tracking-wide text-primary-foreground">
              Set {setNumber}
            </h3>
            <span className="h-px flex-1 bg-border" />
          </div>
          <ul className="space-y-2">
            {groupItems.map((item) =>
              item.kind === "substitution" ? (
                <li
                  key={item.id}
                  className="flex items-start justify-between gap-3 rounded-xl border border-dashed bg-secondary/60 px-3 py-2.5 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-medium">
                      Cambio: Sale {playerName(item.sub.player_out)} → Entra{" "}
                      {playerName(item.sub.player_in)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {[`Set ${item.set_number}`, item.sub.occurred_at].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-semibold text-sky-950">
                    CAM
                  </span>
                </li>
              ) : (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-xl border bg-card px-3 py-2.5 text-sm"
                >
                  <div className="min-w-0">
                    {item.event.player && playerLinks ? (
                      <Link
                        href={`/jugadores/${item.event.player.id}`}
                        className="font-medium hover:underline"
                      >
                        {playerName(item.event.player)}
                      </Link>
                    ) : (
                      <p className="font-medium">
                        {item.event.player ? playerName(item.event.player) : "Sin jugador asignado"}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {POINT_TYPE_META[item.event.point_type].label}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="rounded-lg bg-secondary px-2 py-1 text-sm font-bold tabular-nums text-secondary-foreground">
                      {item.event.homeScore}–{item.event.awayScore}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${POINT_TYPE_META[item.event.point_type].className}`}
                    >
                      {POINT_TYPE_META[item.event.point_type].short}
                    </span>
                  </div>
                </li>
              )
            )}
          </ul>
        </section>
      ))}
    </div>
  );
});
