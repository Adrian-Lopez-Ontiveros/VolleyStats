import { memo } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { MapPin } from "lucide-react";
import { matchStatusMeta } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { TeamLogo } from "@/components/teams/team-logo";
import type { MatchWithTeams, Team } from "@/lib/types";

export const MatchCard = memo(function MatchCard({ match }: { match: MatchWithTeams }) {
  const status = matchStatusMeta(match.status);

  return (
    <Link href={`/partidos/${match.id}`}>
      <Card className="transition-transform active:scale-[0.99]">
        <CardContent className="space-y-3 p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium capitalize text-muted-foreground">
              {format(new Date(match.scheduled_at), "EEE d MMM · HH:mm", {
                locale: es,
              })}
            </p>
            <div className="flex flex-wrap justify-end gap-1">
              {match.is_federation ? (
                <Badge className="border-violet-800 bg-violet-600 text-white">Oficial FMV</Badge>
              ) : (
                <Badge className="border-slate-300 bg-slate-100 text-slate-800">Propio</Badge>
              )}
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
            <div className="min-w-[4.5rem] rounded-xl bg-primary px-3 py-2 text-center text-primary-foreground">
              <p className="text-xl font-bold tabular-nums leading-none">
                {match.home_sets} – {match.away_sets}
              </p>
              {match.status === "live" ? (
                <p className="mt-1 text-[10px] uppercase tracking-wide text-orange-300">
                  {match.home_points}-{match.away_points}
                </p>
              ) : null}
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
