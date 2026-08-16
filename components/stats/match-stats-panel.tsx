import dynamic from "next/dynamic";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { AttackServeCards, PossessionCards } from "@/components/stats/skill-stats";
import { formatJersey } from "@/lib/utils";
import { countChartPointTypes, topMatchScorers } from "@/lib/stats";
import {
  attackStatsFromEvents,
  filterTeamEvents,
  formatSkillRate,
  possessionStatsFromEvents,
  receptionStatsFromEvents,
  serveStatsFromEvents,
} from "@/lib/volleyball-stats";
import type { MatchEventWithPlayer, MatchWithTeams } from "@/lib/types";

const PointTypeBarChart = dynamic(
  () => import("@/components/stats/charts").then((mod) => mod.PointTypeBarChart),
  { loading: () => <div className="h-64 w-full" /> }
);

export function MatchStatsPanel({
  match,
  events,
}: {
  match: MatchWithTeams;
  events: MatchEventWithPlayer[];
}) {
  const homeEvents = filterTeamEvents(events, match.home_team_id);
  const awayEvents = filterTeamEvents(events, match.away_team_id);
  const homeCounts = countChartPointTypes(homeEvents);
  const awayCounts = countChartPointTypes(awayEvents);
  const scorers = topMatchScorers(events);
  const homeLabel = match.home_team.short_name || match.home_team.name;
  const awayLabel = match.away_team.short_name || match.away_team.name;
  const homeAttack = attackStatsFromEvents(homeEvents);
  const awayAttack = attackStatsFromEvents(awayEvents);
  const homeServe = serveStatsFromEvents(homeEvents);
  const awayServe = serveStatsFromEvents(awayEvents);
  const homeReception = receptionStatsFromEvents(homeEvents);
  const awayReception = receptionStatsFromEvents(awayEvents);
  const possession = possessionStatsFromEvents(events, match.home_team_id, match.away_team_id);

  if (events.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Cuando se anoten puntos verás aquí el resumen estadístico del partido.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <h3 className="mb-3 text-sm font-semibold">Acciones por tipo</h3>
          <PointTypeBarChart
            home={homeCounts}
            away={awayCounts}
            homeLabel={homeLabel}
            awayLabel={awayLabel}
          />
        </CardContent>
      </Card>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold">{homeLabel}</h3>
        <AttackServeCards attack={homeAttack} serve={homeServe} reception={homeReception} />
        <PossessionCards
          sideOut={possession.home.sideOut}
          breakPoint={possession.home.breakPoint}
        />
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold">{awayLabel}</h3>
        <AttackServeCards attack={awayAttack} serve={awayServe} reception={awayReception} />
        <PossessionCards
          sideOut={possession.away.sideOut}
          breakPoint={possession.away.breakPoint}
        />
      </section>

      {possession.bySet.length > 0 ? (
        <Card>
          <CardContent className="space-y-3 p-4">
            <h3 className="text-sm font-semibold">Side-out y break-point por set</h3>
            <ul className="space-y-2 text-sm">
              {possession.bySet.map((row) => (
                <li
                  key={row.setNumber}
                  className="rounded-xl border bg-background px-3 py-2"
                >
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Set {row.setNumber}
                  </p>
                  <p className="tabular-nums">
                    {homeLabel}: SO {formatSkillRate(row.home.sideOut.rate)} · BP{" "}
                    {formatSkillRate(row.home.breakPoint.rate)}
                  </p>
                  <p className="tabular-nums">
                    {awayLabel}: SO {formatSkillRate(row.away.sideOut.rate)} · BP{" "}
                    {formatSkillRate(row.away.breakPoint.rate)}
                  </p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <TeamMiniStats
          label={homeLabel}
          attacks={homeAttack.kills}
          blocks={homeCounts.block}
          aces={homeServe.aces}
          errors={homeCounts.error}
        />
        <TeamMiniStats
          label={awayLabel}
          attacks={awayAttack.kills}
          blocks={awayCounts.block}
          aces={awayServe.aces}
          errors={awayCounts.error}
        />
      </div>

      {scorers.length > 0 ? (
        <Card>
          <CardContent className="p-4">
            <h3 className="mb-3 text-sm font-semibold">Máximos anotadores</h3>
            <ol className="space-y-2">
              {scorers.map((scorer, index) => (
                <li key={scorer.playerId} className="flex items-center justify-between text-sm">
                  <Link href={`/jugadores/${scorer.playerId}`} className="font-medium hover:underline">
                    {index + 1}. {scorer.name} {formatJersey(scorer.jersey)}
                  </Link>
                  <span className="tabular-nums text-muted-foreground">
                    {scorer.points} pts
                    {scorer.errors ? ` · ${scorer.errors} err` : ""}
                  </span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function TeamMiniStats({
  label,
  attacks,
  blocks,
  aces,
  errors,
}: {
  label: string;
  attacks: number;
  blocks: number;
  aces: number;
  errors: number;
}) {
  return (
    <Card>
      <CardContent className="space-y-1 p-4 text-sm">
        <p className="font-semibold">{label}</p>
        <p className="text-muted-foreground">Kills {attacks}</p>
        <p className="text-muted-foreground">Bloqueos {blocks}</p>
        <p className="text-muted-foreground">Aces {aces}</p>
        <p className="text-muted-foreground">Errores {errors}</p>
      </CardContent>
    </Card>
  );
}
