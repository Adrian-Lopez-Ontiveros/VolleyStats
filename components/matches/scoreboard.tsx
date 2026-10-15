import { memo } from "react";
import { matchStatusMeta, maxSetsOf, setsToWinOf } from "@/lib/constants";
import { isFriendlyMatch } from "@/components/matches/match-kind";
import { Badge } from "@/components/ui/badge";
import { TeamLogo } from "@/components/teams/team-logo";
import { cn } from "@/lib/utils";
import { isNotStarted, upcomingWhen } from "@/components/matches/match-upcoming";
import type { MatchWithTeams, Team } from "@/lib/types";

export const Scoreboard = memo(function Scoreboard({ match }: { match: MatchWithTeams }) {
  const status = matchStatusMeta(match.status);
  const friendly = isFriendlyMatch(match);
  const setsToWin = setsToWinOf(match);
  const upcoming = isNotStarted(match);
  const when = upcoming ? upcomingWhen(match) : null;
  return (
    <section
      className={cn(
        "overflow-hidden rounded-3xl shadow-card",
        friendly
          ? "bg-orange-100 text-orange-950 dark:border dark:border-orange-400/35 dark:bg-orange-950/50 dark:text-orange-50"
          : "bg-primary text-primary-foreground"
      )}
    >
      <div className="flex items-center justify-between px-4 pt-4">
        <p
          className={cn(
            "text-xs font-semibold uppercase tracking-[0.18em]",
            friendly ? "text-orange-700 dark:text-orange-200" : "text-orange-200"
          )}
        >
          {upcoming
            ? friendly
              ? `Amistoso · Mejor de ${maxSetsOf(setsToWin)}`
              : "Próximo partido"
            : match.status === "finished"
            ? friendly
              ? `Amistoso · Mejor de ${maxSetsOf(setsToWin)}`
              : "Resultado"
            : friendly
              ? `Amistoso · Mejor de ${maxSetsOf(setsToWin)} · Set ${match.current_set}`
              : `Set ${match.current_set}`}
        </p>
        <Badge className={status.className}>{status.label}</Badge>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 px-3 py-5 sm:gap-3 sm:px-4">
        <TeamBlock team={match.home_team} align="right" inverted={!friendly} />
        <div className="text-center">
          {upcoming && when ? (
            <div className="max-w-[7.5rem]">
              <p className="text-xs font-semibold capitalize">{when.date}</p>
              <p className="text-lg font-black leading-tight tabular-nums">{when.time}</p>
            </div>
          ) : match.status === "finished" ? (
            <p className="text-3xl font-black tabular-nums tracking-tight sm:text-4xl">
              {match.home_sets}
              <span className={cn("mx-1", friendly ? "text-orange-500" : "text-orange-300")}>–</span>
              {match.away_sets}
            </p>
          ) : (
            <>
              <p className="text-3xl font-black tabular-nums tracking-tight sm:text-4xl">
                {match.home_points}
                <span className={cn("mx-1", friendly ? "text-orange-500" : "text-orange-300")}>–</span>
                {match.away_points}
              </p>
              <p
                className={cn(
                  "mt-1 text-xs font-semibold uppercase tracking-wide",
                  friendly ? "text-orange-800/80 dark:text-orange-200/90" : "text-orange-200/90"
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
      {upcoming && match.location?.trim() ? (
        <p
          className={cn(
            "border-t px-4 py-3 text-center text-sm font-semibold",
            friendly ? "border-orange-200 dark:border-orange-400/25" : "border-white/10"
          )}
        >
          📍 {match.location.trim()}
        </p>
      ) : null}
      {(match.set_scores ?? []).length > 0 ? (
        <div
          className={cn(
            "flex flex-wrap justify-center gap-2 border-t px-4 py-3 text-xs",
            friendly ? "border-orange-200 dark:border-orange-400/25" : "border-white/10"
          )}
        >
          {(match.set_scores ?? []).map((set, index) => (
            <span
              key={`${set.home}-${set.away}-${index}`}
              className={cn(
                "rounded-full px-2.5 py-1 font-medium tabular-nums",
                friendly ? "bg-orange-200/80 dark:bg-orange-500/20" : "bg-white/10"
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
      <p className="hyphens-none text-[clamp(0.625rem,3vw,0.875rem)] font-bold leading-tight [overflow-wrap:normal] [word-break:normal] sm:text-base">
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
      size="sm"
      inverted={inverted}
    />
  );

  return (
    <div className={`flex min-w-0 items-center gap-1.5 ${align === "right" ? "justify-end" : "justify-start"}`}>
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
