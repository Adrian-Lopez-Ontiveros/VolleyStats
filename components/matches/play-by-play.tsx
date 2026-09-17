"use client";

import { memo, useMemo } from "react";
import { TeamLogo } from "@/components/teams/team-logo";
import { cn } from "@/lib/utils";
import { annotateEventScores, isScoringAction } from "@/lib/volleyball";
import type { MatchEventWithPlayer, Team } from "@/lib/types";

export type RallyTeamInfo = Pick<Team, "name" | "short_name" | "logo_url" | "federation_team_id">;

export const PlayByPlay = memo(function PlayByPlay({
  events,
  homeTeamId,
  homeTeam,
  awayTeam,
}: {
  events: MatchEventWithPlayer[];
  homeTeamId: string;
  homeTeam: RallyTeamInfo;
  awayTeam: RallyTeamInfo;
}) {
  const homeLabel = homeTeam.short_name || homeTeam.name;
  const awayLabel = awayTeam.short_name || awayTeam.name;
  const groups = useMemo(() => {
    const scored = annotateEventScores(
      events.filter((event) => isScoringAction(event.point_type)),
      homeTeamId
    );
    const bySet = new Map<number, typeof scored>();
    for (const event of scored) {
      const list = bySet.get(event.set_number);
      if (list) list.push(event);
      else bySet.set(event.set_number, [event]);
    }
    return [...bySet.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([setNumber, setEvents]) => {
        const chronological = [...setEvents].sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        const last = chronological[chronological.length - 1];
        return {
          setNumber,
          homeScore: last?.homeScore ?? 0,
          awayScore: last?.awayScore ?? 0,
          points: [...chronological].reverse(),
        };
      });
  }, [events, homeTeamId]);

  if (groups.length === 0) {
    return (
      <section className="overflow-hidden rounded-3xl border bg-card shadow-card">
        <RallyHeader />
        <p className="px-4 py-8 text-center text-sm text-muted-foreground">
          Cuando se anote el primer punto verás aquí el marcador punto a punto.
        </p>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-3xl border bg-card shadow-card">
      <RallyHeader />
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
              {group.points.map((event, index) => {
                const homeScored = event.scoring_team_id === homeTeamId;
                const latest = groupIndex === 0 && index === 0;
                return (
                  <li
                    key={event.id}
                    className={cn(
                      "grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 rounded-2xl px-2 py-2 sm:gap-3 sm:px-3",
                      latest ? "bg-orange-50 ring-1 ring-orange-200" : "bg-secondary/40"
                    )}
                  >
                    <div className="flex min-w-0 items-center justify-end gap-2">
                      {homeScored ? (
                        <RallyTeamSide team={homeTeam} label={homeLabel} align="right" />
                      ) : null}
                    </div>
                    <RallyScore
                      homeScore={event.homeScore}
                      awayScore={event.awayScore}
                      highlight={homeScored ? "home" : "away"}
                    />
                    <div className="flex min-w-0 items-center justify-start gap-2">
                      {!homeScored ? (
                        <RallyTeamSide team={awayTeam} label={awayLabel} align="left" />
                      ) : null}
                    </div>
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

export function RallyScore({
  homeScore,
  awayScore,
  highlight,
}: {
  homeScore: number;
  awayScore: number;
  highlight: "home" | "away" | "none";
}) {
  return (
    <p className="flex min-w-[4.75rem] items-baseline justify-center gap-1 rounded-xl bg-white px-2.5 py-1 text-center shadow-sm">
      <span
        className={cn(
          "text-lg font-black tabular-nums leading-none",
          highlight === "home" ? "text-orange-600" : "text-slate-400"
        )}
      >
        {homeScore}
      </span>
      <span className="text-xs font-semibold text-slate-300">–</span>
      <span
        className={cn(
          "text-lg font-black tabular-nums leading-none",
          highlight === "away" ? "text-orange-600" : "text-slate-400"
        )}
      >
        {awayScore}
      </span>
    </p>
  );
}

export function RallyHeader({
  title = "Punto a punto",
  eyebrow = "Seguimiento",
}: {
  title?: string;
  eyebrow?: string;
}) {
  return (
    <header className="bg-primary px-4 py-3 text-primary-foreground">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-orange-300">
        {eyebrow}
      </p>
      <h2 className="text-lg font-bold leading-tight">{title}</h2>
    </header>
  );
}

export function RallyTeamSide({
  team,
  label,
  align,
}: {
  team: RallyTeamInfo;
  label: string;
  align: "left" | "right";
}) {
  const logo = (
    <TeamLogo
      name={team.name}
      shortName={team.short_name}
      logoUrl={team.logo_url}
      federationTeamId={team.federation_team_id}
      size="xs"
    />
  );
  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-2",
        align === "right" ? "justify-end" : "justify-start"
      )}
    >
      {align === "right" ? (
        <>
          <span className="truncate text-sm font-semibold">{label}</span>
          {logo}
        </>
      ) : (
        <>
          {logo}
          <span className="truncate text-sm font-semibold">{label}</span>
        </>
      )}
    </div>
  );
}
