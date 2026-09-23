"use client";

import { memo, useMemo } from "react";
import Link from "next/link";
import { POINT_TYPE_META } from "@/lib/constants";
import { cn, formatJersey } from "@/lib/utils";
import { annotateEventScores, isScoringAction } from "@/lib/volleyball";
import {
  RallyHeader,
  RallyScore,
  RallyTeamSide,
  type RallyTeamInfo,
} from "@/components/matches/play-by-play";
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
  if (!player) return "Sin jugador";
  return player.jersey_number != null
    ? `${formatJersey(player.jersey_number)} ${player.full_name}`
    : player.full_name;
}

export const PointHistory = memo(function PointHistory({
  events,
  substitutions = [],
  homeTeamId,
  homeTeam,
  awayTeam,
  limit,
  playerLinks = true,
}: {
  events: MatchEventWithPlayer[];
  substitutions?: MatchSubstitution[];
  homeTeamId: string;
  homeTeam: RallyTeamInfo;
  awayTeam: RallyTeamInfo;
  limit?: number;
  playerLinks?: boolean;
}) {
  const homeLabel = homeTeam.short_name || homeTeam.name;
  const awayLabel = awayTeam.short_name || awayTeam.name;
  const groups = useMemo(() => {
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

    const visible = limit ? [...items].reverse().slice(0, limit).reverse() : items;
    const bySet = new Map<number, HistoryItem[]>();
    for (const item of visible) {
      const list = bySet.get(item.set_number);
      if (list) list.push(item);
      else bySet.set(item.set_number, [item]);
    }

    return [...bySet.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([setNumber, setItems]) => {
        const chronological = [...setItems].sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        const lastPoint = [...chronological]
          .reverse()
          .find((item): item is Extract<HistoryItem, { kind: "point" }> => item.kind === "point");
        return {
          setNumber,
          homeScore: lastPoint?.event.homeScore ?? 0,
          awayScore: lastPoint?.event.awayScore ?? 0,
          items: [...chronological].reverse(),
        };
      });
  }, [events, substitutions, homeTeamId, limit]);

  if (groups.length === 0) {
    return (
      <section className="overflow-hidden rounded-3xl border bg-card shadow-card">
        <RallyHeader title="Historial del partido" />
        <p className="px-4 py-8 text-center text-sm text-muted-foreground">
          Todavía no hay puntos ni cambios en este partido.
        </p>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-3xl border bg-card shadow-card">
      <RallyHeader title="Historial del partido" />
      <div className="divide-y">
        {groups.map((group, groupIndex) => (
          <div key={group.setNumber} className="px-3 py-4 sm:px-4">
            <div className="mb-3 flex items-center gap-3">
              <span className="h-px flex-1 bg-border" />
              <p className="rounded-full bg-primary px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-primary-foreground">
                Set {group.setNumber}
                <span className="ml-2 font-black tabular-nums text-orange-300">
                  {group.homeScore}–{group.awayScore}
                </span>
              </p>
              <span className="h-px flex-1 bg-border" />
            </div>
            <ol className="space-y-1.5">
              {group.items.map((item, index) => {
                const latest = groupIndex === 0 && index === 0;
                if (item.kind === "substitution") {
                  const homeSub = item.sub.team_id === homeTeamId;
                  return (
                    <li
                      key={item.id}
                      className="rounded-2xl border border-dashed border-sky-200 bg-sky-50 px-3 py-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-sky-800">
                          Cambio · {homeSub ? homeLabel : awayLabel}
                        </p>
                        <span className="rounded-full bg-sky-200 px-2 py-0.5 text-[11px] font-semibold text-sky-950">
                          CAM
                        </span>
                      </div>
                      <p className="mt-1 text-sm font-medium text-sky-950">
                        Sale {playerName(item.sub.player_out)} → Entra {playerName(item.sub.player_in)}
                      </p>
                    </li>
                  );
                }

                const event = item.event;
                const scoring = isScoringAction(event.point_type);
                const homeScored = event.scoring_team_id === homeTeamId;
                const awayScored = Boolean(event.scoring_team_id) && event.scoring_team_id !== homeTeamId;
                const actingHome = event.acting_team_id === homeTeamId;
                const meta = POINT_TYPE_META[event.point_type];
                const highlight = homeScored ? "home" : awayScored ? "away" : "none";

                return (
                  <li
                    key={item.id}
                    className={cn(
                      "grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 rounded-2xl px-2 py-2 sm:gap-3 sm:px-3",
                      latest
                        ? "bg-orange-50 text-orange-950 ring-1 ring-orange-200 dark:bg-orange-500/15 dark:text-foreground dark:ring-orange-400/30"
                        : scoring
                          ? "bg-secondary/40"
                          : "border border-dashed bg-background"
                    )}
                  >
                    <RallyDetails
                      align="right"
                      showTeam={scoring && homeScored}
                      showAction={actingHome}
                      team={homeTeam}
                      label={homeLabel}
                      event={event}
                      meta={meta}
                      playerLinks={playerLinks}
                    />
                    <RallyScore
                      homeScore={event.homeScore}
                      awayScore={event.awayScore}
                      highlight={highlight}
                    />
                    <RallyDetails
                      align="left"
                      showTeam={scoring && awayScored}
                      showAction={!actingHome}
                      team={awayTeam}
                      label={awayLabel}
                      event={event}
                      meta={meta}
                      playerLinks={playerLinks}
                    />
                  </li>
                );
              })}
            </ol>
          </div>
        ))}
      </div>
    </section>
  );
});

function RallyDetails({
  align,
  showTeam,
  showAction,
  team,
  label,
  event,
  meta,
  playerLinks,
}: {
  align: "left" | "right";
  showTeam: boolean;
  showAction: boolean;
  team: RallyTeamInfo;
  label: string;
  event: ReturnType<typeof annotateEventScores<MatchEventWithPlayer>>[number];
  meta: (typeof POINT_TYPE_META)[keyof typeof POINT_TYPE_META];
  playerLinks: boolean;
}) {
  if (!showTeam && !showAction) return <div />;

  const name = event.player ? playerName(event.player) : "Sin jugador asignado";
  const nameNode =
    event.player && playerLinks ? (
      <Link href={`/jugadores/${event.player.id}`} className="truncate font-medium hover:underline">
        {name}
      </Link>
    ) : (
      <p className="truncate font-medium">{name}</p>
    );

  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-1",
        align === "right" ? "items-end text-right" : "items-start text-left"
      )}
    >
      {showTeam ? <RallyTeamSide team={team} label={label} align={align} /> : null}
      {showAction ? (
        <>
          {nameNode}
          <div
            className={cn(
              "flex flex-wrap items-center gap-1.5",
              align === "right" ? "justify-end" : "justify-start"
            )}
          >
            <span className="text-[11px] text-muted-foreground">{meta.label}</span>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                meta.className
              )}
            >
              {meta.short}
            </span>
          </div>
        </>
      ) : null}
    </div>
  );
}
