import { memo } from "react";
import { matchStatusMeta } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { TeamLogo } from "@/components/teams/team-logo";
import type { MatchWithTeams, Team } from "@/lib/types";

export const Scoreboard = memo(function Scoreboard({ match }: { match: MatchWithTeams }) {
  const status = matchStatusMeta(match.status);
  return (
    <section className="overflow-hidden rounded-3xl bg-primary text-primary-foreground shadow-card">
      <div className="flex items-center justify-between px-4 pt-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-300">
          Set {match.current_set}
        </p>
        <Badge className={status.className}>{status.label}</Badge>
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 py-5">
        <TeamBlock team={match.home_team} align="right" />
        <div className="text-center">
          <p className="text-4xl font-black tabular-nums tracking-tight">
            {match.home_points}
            <span className="mx-1 text-orange-300">–</span>
            {match.away_points}
          </p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-orange-200/90">
            Sets{" "}
            <span className="tabular-nums">
              {match.home_sets}–{match.away_sets}
            </span>
          </p>
        </div>
        <TeamBlock team={match.away_team} align="left" />
      </div>
      {(match.set_scores ?? []).length > 0 ? (
        <div className="flex flex-wrap justify-center gap-2 border-t border-white/10 px-4 py-3 text-xs">
          {(match.set_scores ?? []).map((set, index) => (
            <span
              key={`${set.home}-${set.away}-${index}`}
              className="rounded-full bg-white/10 px-2.5 py-1 font-medium tabular-nums"
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
}: {
  team: Pick<Team, "name" | "short_name" | "logo_url" | "federation_team_id">;
  align: "left" | "right";
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
      inverted
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
