import { memo } from "react";
import Link from "next/link";
import { matchStatusMeta } from "@/lib/constants";
import { formatMatchWhen } from "@/lib/federation/schedule";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { MatchKindBadge, cnMatchCard, isFriendlyMatch } from "@/components/matches/match-kind";
import { MatchVenueLine } from "@/components/matches/match-place-link";
import { SetScoreLine } from "@/components/matches/set-score-line";
import { TeamLogo } from "@/components/teams/team-logo";
import { cn } from "@/lib/utils";
import { isNotStarted, upcomingWhen } from "@/components/matches/match-upcoming";
import type { MatchWithTeams, Team } from "@/lib/types";

export const MatchCard = memo(function MatchCard({
  match,
  href,
  note,
}: {
  match: MatchWithTeams;
  href?: string | null;
  note?: string;
}) {
  const status = matchStatusMeta(match.status);
  const upcoming = isNotStarted(match);
  const when = upcoming ? upcomingWhen(match) : null;
  const summary = (
    <>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium capitalize text-muted-foreground">
          {formatMatchWhen({
            scheduledAt: match.scheduled_at,
            notes: match.notes,
            isFederation: match.is_federation,
          })}
        </p>
        <div className="flex flex-wrap justify-end gap-1">
          <MatchKindBadge match={match} round={match.federation_round} />
          {note ? (
            <Badge className="border-amber-700 bg-amber-400 text-amber-950">{note}</Badge>
          ) : null}
          <Badge
            className={
              match.status === "live"
                ? "border-orange-800 bg-orange-500 text-white"
                : match.status === "scheduled"
                  ? "border-sky-800 bg-sky-600 text-white"
                  : match.status === "cancelled"
                    ? "border-slate-400 bg-slate-200 text-slate-900"
                    : "border-slate-800 bg-slate-700 text-white"
            }
          >
            {status.label}
          </Badge>
        </div>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1.5 sm:gap-2">
        <TeamSide team={match.home_team} align="right" caption="Local" />
        <div
          className={cn(
            "min-w-[3.25rem] rounded-xl px-1.5 py-2 text-center sm:px-3",
            isFriendlyMatch(match)
              ? "bg-orange-100 text-orange-950 dark:bg-orange-500/20 dark:text-orange-50"
              : "bg-primary text-primary-foreground"
          )}
        >
          {upcoming && when ? (
            <>
              {when.isWeekend ? (
                <p className="max-w-[4.5rem] text-center text-[11px] font-bold leading-tight">{when.time}</p>
              ) : (
                <p className="text-base font-bold leading-none tabular-nums">{when.time}</p>
              )}
            </>
          ) : match.status === "finished" ? (
            <p className="text-xl font-bold tabular-nums leading-none">
              {match.home_sets} – {match.away_sets}
            </p>
          ) : (
            <>
              <p className="text-xl font-bold tabular-nums leading-none">
                {match.home_points} – {match.away_points}
              </p>
              <p
                className={cn(
                  "mt-1 text-[10px] font-semibold uppercase tracking-wide",
                  isFriendlyMatch(match) ? "text-orange-700 dark:text-orange-200" : "text-orange-300"
                )}
              >
                Sets{" "}
                <span className="tabular-nums">
                  {match.home_sets}–{match.away_sets}
                </span>
              </p>
            </>
          )}
        </div>
        <TeamSide team={match.away_team} align="left" caption="Visitante" />
      </div>
      <SetScoreLine scores={match.set_scores} />
    </>
  );

  return (
    <Card className={cnMatchCard(match)}>
      <CardContent className="space-y-3 p-4">
        {href === null ? (
          <div className="space-y-3">{summary}</div>
        ) : (
          <Link href={href ?? `/partidos/${match.id}`} className="block space-y-3">
            {summary}
          </Link>
        )}
        <MatchVenueLine location={match.location} court={match.court} referees={match.referees} />
      </CardContent>
    </Card>
  );
});

function TeamSide({
  team,
  caption,
}: {
  team: Pick<Team, "name" | "short_name" | "logo_url" | "federation_team_id">;
  align?: "left" | "right";
  caption: string;
}) {
  const logo = (
    <TeamLogo
      name={team.name}
      shortName={team.short_name}
      logoUrl={team.logo_url}
      federationTeamId={team.federation_team_id}
      size="sm"
    />
  );
  const label = (
    <div className="w-full min-w-0 text-center">
      <p className="text-[clamp(0.5625rem,2.7vw,0.8125rem)] font-semibold leading-tight hyphens-none [overflow-wrap:normal] [word-break:normal] sm:text-sm">
        {team.name}
      </p>
      <p className="text-[11px] text-muted-foreground">{caption}</p>
    </div>
  );

  // Escudo encima y nombre centrado debajo, igual en local y visitante.
  return (
    <div className="flex min-w-0 flex-col items-center justify-center gap-1 text-center">
      {logo}
      {label}
    </div>
  );
}
