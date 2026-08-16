import { memo } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { MapPin } from "lucide-react";
import { MATCH_STATUS_META } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { TeamLogo } from "@/components/teams/team-logo";
import type { MatchWithTeams } from "@/lib/types";

export const MatchCard = memo(function MatchCard({ match }: { match: MatchWithTeams }) {
  const status = MATCH_STATUS_META[match.status];
  const homeName = match.home_team.short_name || match.home_team.name;
  const awayName = match.away_team.short_name || match.away_team.name;

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
            <Badge className={status.className} variant="secondary">
              {status.label}
            </Badge>
          </div>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <div className="flex items-center justify-end gap-2 text-right">
              <div>
                <p className="font-semibold leading-tight">{homeName}</p>
                <p className="text-[11px] text-muted-foreground">Local</p>
              </div>
              <TeamLogo
                name={match.home_team.name}
                shortName={match.home_team.short_name}
                logoUrl={match.home_team.logo_url}
                size="sm"
              />
            </div>
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
            <div className="flex items-center gap-2">
              <TeamLogo
                name={match.away_team.name}
                shortName={match.away_team.short_name}
                logoUrl={match.away_team.logo_url}
                size="sm"
              />
              <div>
                <p className="font-semibold leading-tight">{awayName}</p>
                <p className="text-[11px] text-muted-foreground">Visitante</p>
              </div>
            </div>
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
