import { memo } from "react";
import Link from "next/link";
import { MapPin } from "lucide-react";
import { matchStatusMeta } from "@/lib/constants";
import { formatMatchWhen } from "@/lib/federation/schedule";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { MatchKindBadge, cnMatchCard, isFriendlyMatch } from "@/components/matches/match-kind";
import { TeamLogo } from "@/components/teams/team-logo";
import { cn } from "@/lib/utils";
import type { MatchWithTeams, Team } from "@/lib/types";

export const MatchCard = memo(function MatchCard({ match }: { match: MatchWithTeams }) {
  const status = matchStatusMeta(match.status);

  return (
    <Link href={`/partidos/${match.id}`} className="block h-full">
      <Card className={cnMatchCard(match)}>
        <CardContent className="space-y-3 p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium capitalize text-muted-foreground">
              {formatMatchWhen({
                scheduledAt: match.scheduled_at,
                notes: match.notes,
                isFederation: match.is_federation,
              })}
            </p>
            <div className="flex flex-wrap justify-end gap-1">
              <MatchKindBadge match={match} />
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
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <TeamSide team={match.home_team} align="right" caption="Local" />
            <div
              className={cn(
                "min-w-[4.5rem] rounded-xl px-3 py-2 text-center",
                isFriendlyMatch(match)
                  ? "bg-orange-100 text-orange-950"
                  : "bg-primary text-primary-foreground"
              )}
            >
              {match.status === "finished" ? (
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
                      isFriendlyMatch(match) ? "text-orange-700" : "text-orange-300"
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
          {match.location ? (
            <p className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              {match.location}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </Link>
  );
});

function TeamSide({
  team,
  align,
  caption,
}: {
  team: Pick<Team, "name" | "short_name" | "logo_url" | "federation_team_id">;
  align: "left" | "right";
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
    <div className={align === "right" ? "min-w-0 text-right" : "min-w-0 text-left"}>
      <p className="text-[13px] font-semibold leading-tight [overflow-wrap:anywhere] sm:text-sm">
        {team.name}
      </p>
      <p className="text-[11px] text-muted-foreground">{caption}</p>
    </div>
  );

  return (
    <div
      className={`flex min-w-0 items-center gap-2 ${align === "right" ? "justify-end" : "justify-start"}`}
    >
      {align === "right" ? (
        <>
          {label}
          {logo}
        </>
      ) : (
        <>
          {logo}
          {label}
        </>
      )}
    </div>
  );
}
