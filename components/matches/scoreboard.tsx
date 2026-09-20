import { memo } from "react";
import { matchStatusMeta, maxSetsOf, setsToWinOf } from "@/lib/constants";
import { isFriendlyMatch } from "@/components/matches/match-kind";
import { Badge } from "@/components/ui/badge";
import { TeamLogo } from "@/components/teams/team-logo";
import { cn } from "@/lib/utils";
import type { MatchWithTeams, Team } from "@/lib/types";

export const Scoreboard = memo(function Scoreboard({ match }: { match: MatchWithTeams }) {
  const status = matchStatusMeta(match.status);
  const friendly = isFriendlyMatch(match);
  const setsToWin = setsToWinOf(match);
  return (
    <section
      className={cn(
        "overflow-hidden rounded-3xl shadow-card",
        friendly ? "bg-orange-100 text-orange-950" : "bg-primary text-primary-foreground"
      )}
    >
      <div className="flex items-center justify-between px-4 pt-4">
        <p
          className={cn(
            "text-xs font-semibold uppercase tracking-[0.18em]",
            friendly ? "text-orange-700" : "text-orange-200"
          )}
        >
          {match.status === "finished"
            ? friendly
              ? `Amistoso · Mejor de ${maxSetsOf(setsToWin)}`
              : "Resultado"
            : friendly
              ? `Amistoso · Mejor de ${maxSetsOf(setsToWin)} · Set ${match.current_set}`
              : `Set ${match.current_set}`}
        </p>
        <Badge className={status.className}>{status.label}</Badge>
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 py-5">
        <TeamBlock team={match.home_team} align="right" inverted={!friendly} />
        <div className="text-center">
          {match.status === "finished" ? (
            <p className="text-4xl font-black tabular-nums tracking-tight">
              {match.home_sets}
              <span className={cn("mx-1", friendly ? "text-orange-500" : "text-orange-300")}>–</span>
              {match.away_sets}
            </p>
          ) : (
            <>
              <p className="text-4xl font-black tabular-nums tracking-tight">
                {match.home_points}
                <span className={cn("mx-1", friendly ? "text-orange-500" : "text-orange-300")}>–</span>
                {match.away_points}
              </p>
              <p
                className={cn(
                  "mt-1 text-xs font-semibold uppercase tracking-wide",
                  friendly ? "text-orange-800/80" : "text-orange-200/90"
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
        <TeamBlock team={match.away_team} align="left" inverted={!friendly} />
      </div>
      {(match.set_scores ?? []).length > 0 ? (
        <div
          className={cn(
            "flex flex-wrap justify-center gap-2 border-t px-4 py-3 text-xs",
            friendly ? "border-orange-200" : "border-white/10"
          )}
        >
          {(match.set_scores ?? []).map((set, index) => (
            <span
              key={`${set.home}-${set.away}-${index}`}
              className={cn(
                "rounded-full px-2.5 py-1 font-medium tabular-nums",
                friendly ? "bg-orange-200/80" : "bg-white/10"
              )}
            >
              S{index + 1} {set.home}-{set.away}
            </span>
          ))}
        </div>
      ) : null}
    </section>
  );
});

function TeamBlock({
  team,
  align,
  inverted = true,
}: {
  team: Pick<Team, "name" | "short_name" | "logo_url" | "federation_team_id">;
  align: "left" | "right";
  inverted?: boolean;
}) {
  const label = (
    <div className={align === "right" ? "min-w-0 text-right" : "min-w-0 text-left"}>
      <p className="text-sm font-bold leading-tight [overflow-wrap:anywhere] sm:text-lg">
        {team.name}
      </p>
    </div>
  );
  const logo = (
    <TeamLogo
      name={team.name}
      shortName={team.short_name}
      logoUrl={team.logo_url}
      federationTeamId={team.federation_team_id}
      size="md"
      inverted={inverted}
    />
  );

  return (
    <div className={`flex min-w-0 items-center gap-2 ${align === "right" ? "justify-end" : "justify-start"}`}>
      {align === "left" ? (
        <>
          {logo}
          {label}
        </>
      ) : (
        <>
          {label}
          {logo}
        </>
      )}
    </div>
  );
}
