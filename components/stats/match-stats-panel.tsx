"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { PhaseFilterBar } from "@/components/stats/phase-filter";
import { RotationTable } from "@/components/stats/rotation-table";
import { AttackServeCards, PossessionCards } from "@/components/stats/skill-stats";
import { formatJersey } from "@/lib/utils";
import { countChartPointTypes, topMatchScorers } from "@/lib/stats";
import { DEFAULT_PHASE_FILTER, filterEventsByPhase, type PhaseFilter } from "@/lib/stat-filters";
import {
  attackStatsFromEvents,
  filterTeamEvents,
  formatSkillRate,
  possessionStatsFromEvents,
  receptionStatsFromEvents,
  rotationStatsForTeam,
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
  const [filter, setFilter] = useState<PhaseFilter>(DEFAULT_PHASE_FILTER);
  const bySet = useMemo(
    () => filterEventsByPhase(events, { sets: filter.sets, possession: "all" }),
    [events, filter.sets]
  );
  const homeView = useMemo(
    () =>
      filterEventsByPhase(bySet, { sets: "all", possession: filter.possession }, match.home_team_id),
    [bySet, filter.possession, match.home_team_id]
  );
  const awayView = useMemo(
    () =>
      filterEventsByPhase(bySet, { sets: "all", possession: filter.possession }, match.away_team_id),
    [bySet, filter.possession, match.away_team_id]
  );
  const homeEvents = filterTeamEvents(homeView, match.home_team_id);
  const awayEvents = filterTeamEvents(awayView, match.away_team_id);
  const homeCounts = countChartPointTypes(homeEvents);
  const awayCounts = countChartPointTypes(awayEvents);
  const scorers = topMatchScorers(bySet);
  const homeLabel = match.home_team.short_name || match.home_team.name;
  const awayLabel = match.away_team.short_name || match.away_team.name;
  const homeAttack = attackStatsFromEvents(homeEvents);
  const awayAttack = attackStatsFromEvents(awayEvents);
  const homeServe = serveStatsFromEvents(homeEvents);
  const awayServe = serveStatsFromEvents(awayEvents);
  const homeReception = receptionStatsFromEvents(homeEvents);
  const awayReception = receptionStatsFromEvents(awayEvents);
  const homePossession = possessionStatsFromEvents(
    homeView,
    match.home_team_id,
    match.away_team_id
  ).home;
  const awayPossession = possessionStatsFromEvents(
    awayView,
    match.home_team_id,
    match.away_team_id
  ).away;
  const possession = possessionStatsFromEvents(bySet, match.home_team_id, match.away_team_id);

  if (events.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Cuando se anoten puntos verás aquí el resumen estadístico del partido.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <PhaseFilterBar value={filter} onChange={setFilter} />

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
          sideOut={homePossession.sideOut}
          breakPoint={homePossession.breakPoint}
        />
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold">{awayLabel}</h3>
        <AttackServeCards attack={awayAttack} serve={awayServe} reception={awayReception} />
        <PossessionCards
          sideOut={awayPossession.sideOut}
          breakPoint={awayPossession.breakPoint}
        />
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Rotaciones · {homeLabel}</h3>
        <RotationTable
          rows={rotationStatsForTeam(
            homeView,
            match.home_team_id,
            match.home_team_id,
            match.away_team_id
          )}
        />
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Rotaciones · {awayLabel}</h3>
        <RotationTable
          rows={rotationStatsForTeam(
            awayView,
            match.away_team_id,
            match.home_team_id,
            match.away_team_id
          )}
        />
      </section>

      {possession.bySet.length > 0 ? (
        <Card>
          <CardContent className="space-y-3 p-4">
            <h3 className="text-sm font-semibold">Puntos recibiendo y con el saque por set</h3>
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
                    {homeLabel}: Recibiendo {formatSkillRate(row.home.sideOut.rate)} · Con
                    saque {formatSkillRate(row.home.breakPoint.rate)}
                  </p>
                  <p className="tabular-nums">
                    {awayLabel}: Recibiendo {formatSkillRate(row.away.sideOut.rate)} · Con
                    saque {formatSkillRate(row.away.breakPoint.rate)}
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
        <p className="text-muted-foreground">Remates {attacks}</p>
        <p className="text-muted-foreground">Bloqueos {blocks}</p>
        <p className="text-muted-foreground">Aces {aces}</p>
        <p className="text-muted-foreground">Errores {errors}</p>
      </CardContent>
    </Card>
  );
}
