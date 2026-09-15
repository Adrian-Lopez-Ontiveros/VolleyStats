"use client";

import Link from "next/link";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { matchStatusMeta } from "@/lib/constants";
import {
  formatMatchWhenShort,
  hasFmvWeekendSchedule,
  madridCalendarKey,
  madridMonthKey,
} from "@/lib/federation/schedule";
import { cn } from "@/lib/utils";
import type { MatchWithTeams } from "@/lib/types";
import { MatchKindBadge, isFriendlyMatch } from "@/components/matches/match-kind";
import { TeamLogo } from "@/components/teams/team-logo";

export function SeasonCalendar({ matches }: { matches: MatchWithTeams[] }) {
  const groups = new Map<string, MatchWithTeams[]>();
  const ordered = [...matches].sort(
    (a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
  );

  for (const match of ordered) {
    const key = madridMonthKey(match.scheduled_at);
    const list = groups.get(key) ?? [];
    list.push(match);
    groups.set(key, list);
  }

  if (ordered.length === 0) return null;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      {[...groups.entries()].map(([monthKey, monthMatches]) => {
        const monthDate = parseISO(`${monthKey}-01`);
        return (
          <section key={monthKey} className="space-y-3">
            <h2 className="text-base font-bold capitalize">
              {format(monthDate, "LLLL yyyy", { locale: es })}
            </h2>
            <div className="space-y-2">
              {groupByDay(monthMatches).map(([day, dayMatches]) => (
                <div key={day} className="flex gap-3">
                  <DayBadge day={day} matches={dayMatches} />
                  <div className="min-w-0 flex-1 space-y-2">
                    {dayMatches.map((match) => (
                      <CalendarMatch key={match.id} match={match} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}


function DayBadge({ day, matches }: { day: string; matches: MatchWithTeams[] }) {
  const weekend = matches.every((match) => hasFmvWeekendSchedule(match.notes));
  if (weekend) {
    const start = parseISO(day);
    const endDay = format(new Date(start.getTime() + 24 * 60 * 60 * 1000), "d");
    return (
      <div className="flex w-14 shrink-0 flex-col items-center rounded-2xl bg-secondary py-2">
        <span className="text-[10px] font-semibold uppercase text-muted-foreground">Finde</span>
        <span className="text-sm font-black tabular-nums leading-tight">
          {format(start, "d")}–{endDay}
        </span>
      </div>
    );
  }
  return (
    <div className="flex w-12 shrink-0 flex-col items-center rounded-2xl bg-secondary py-2">
      <span className="text-[10px] font-semibold uppercase text-muted-foreground">
        {format(parseISO(day), "EEE", { locale: es })}
      </span>
      <span className="text-lg font-black tabular-nums">{format(parseISO(day), "d")}</span>
    </div>
  );
}

function groupByDay(matches: MatchWithTeams[]) {
  const map = new Map<string, MatchWithTeams[]>();
  for (const match of matches) {
    const key = madridCalendarKey(match.scheduled_at);
    const list = map.get(key) ?? [];
    list.push(match);
    map.set(key, list);
  }
  return [...map.entries()];
}

function CalendarMatch({ match }: { match: MatchWithTeams }) {
  const status = matchStatusMeta(match.status);
  const today = madridCalendarKey(match.scheduled_at) === madridCalendarKey(new Date().toISOString());

  return (
    <Link
      href={`/partidos/${match.id}`}
      className={cn(
        "block rounded-2xl border px-3 py-2.5",
        isFriendlyMatch(match)
          ? "border-dashed border-orange-300 bg-gradient-to-br from-orange-50 to-amber-50"
          : "border-violet-200/80 bg-card",
        match.status === "live" && "border-orange-300",
        today && match.status === "scheduled" && !isFriendlyMatch(match) && "border-sky-300"
      )}
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-xs font-medium tabular-nums text-muted-foreground">
          {formatMatchWhenShort({
            scheduledAt: match.scheduled_at,
            notes: match.notes,
            isFederation: match.is_federation,
          })}
        </span>
        <span className="flex flex-wrap justify-end gap-1">
          <MatchKindBadge match={match} />
          <span
            className={cn(
              "rounded-full border px-2 py-0.5 text-[10px] font-semibold text-white",
              match.status === "live" && "border-orange-800 bg-orange-500",
              match.status === "scheduled" && "border-sky-800 bg-sky-600",
              match.status === "finished" && "border-slate-800 bg-slate-700",
              match.status === "cancelled" && "border-slate-400 bg-slate-200 text-slate-900"
            )}
          >
            {status.label}
          </span>
        </span>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_3.25rem_minmax(0,1fr)] items-center gap-1.5 text-sm">
        <span className="flex min-w-0 items-center gap-1.5 font-semibold">
          <TeamLogo
            name={match.home_team.name}
            shortName={match.home_team.short_name}
            logoUrl={match.home_team.logo_url}
            federationTeamId={match.home_team.federation_team_id}
            size="sm"
          />
          <span className="line-clamp-2 leading-tight">{match.home_team.name}</span>
        </span>
        <span className="text-center font-black tabular-nums leading-none">
          {match.home_sets}–{match.away_sets}
        </span>
        <span className="flex min-w-0 items-center justify-end gap-1.5 font-semibold">
          <span className="line-clamp-2 text-right leading-tight">{match.away_team.name}</span>
          <TeamLogo
            name={match.away_team.name}
            shortName={match.away_team.short_name}
            logoUrl={match.away_team.logo_url}
            federationTeamId={match.away_team.federation_team_id}
            size="sm"
          />
        </span>
      </div>
    </Link>
  );
}
