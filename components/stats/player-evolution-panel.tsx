"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { EVOLUTION_METRICS, PlayerEvolutionChart } from "@/components/stats/charts";
import { ChipRow, PhaseFilterBar } from "@/components/stats/phase-filter";
import { ErrorBreakdownSheet } from "@/components/stats/error-breakdown-sheet";
import { AttackServeCards } from "@/components/stats/skill-stats";
import { StatSummary } from "@/components/stats/stat-summary";
import { Card, CardContent } from "@/components/ui/card";
import { DEFAULT_PHASE_FILTER, filterEventsByPhase, type PhaseFilter } from "@/lib/stat-filters";
import {
  buildPlayerMatchSeries,
  formatEfficiency,
  formatMatchLabel,
  summarizePlayerSeries,
  type PlayerMatchSample,
} from "@/lib/stats";
import { errorBreakdownFromEvents } from "@/lib/error-breakdown";
import { cn } from "@/lib/utils";
import {
  attackStatsFromEvents,
  defenseStatsFromEvents,
  formatAttackEfficiency,
  receptionStatsFromEvents,
  serveStatsFromEvents,
} from "@/lib/volleyball-stats";
import type { PointType } from "@/lib/types";

export type PlayerStatEventMatch = {
  scheduled_at?: string | null;
  status?: string | null;
  home_team_id?: string | null;
  away_team_id?: string | null;
  home_team?: { name?: string | null; short_name?: string | null } | null;
  away_team?: { name?: string | null; short_name?: string | null } | null;
};

export type PlayerStatEvent = {
  match_id: string;
  point_type: PointType;
  created_at: string;
  set_number?: number | null;
  serving_team_id?: string | null;
  match?: PlayerStatEventMatch | null;
};

type MatchOption = { id: string; label: string; date: string };

function teamDisplayName(
  team?: { name?: string | null; short_name?: string | null } | null
) {
  return team?.short_name || team?.name || "Rival";
}

function buildMatchOptions(
  events: PlayerStatEvent[],
  teamId?: string | null
): MatchOption[] {
  const byMatch = new Map<string, MatchOption>();

  for (const event of events) {
    if (byMatch.has(event.match_id)) continue;
    const dateIso = event.match?.scheduled_at || event.created_at;
    const dateLabel = formatMatchLabel(dateIso);
    const match = event.match;
    let label = dateLabel;

    if (match && teamId) {
      const isHome = match.home_team_id === teamId;
      const opponent = isHome ? match.away_team : match.home_team;
      label = `vs ${teamDisplayName(opponent)} · ${dateLabel}`;
    } else if (match?.home_team || match?.away_team) {
      const home = teamDisplayName(match.home_team);
      const away = teamDisplayName(match.away_team);
      label = `${home}–${away} · ${dateLabel}`;
    }

    byMatch.set(event.match_id, {
      id: event.match_id,
      label,
      date: dateIso,
    });
  }

  return [...byMatch.values()].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
}

export function PlayerEvolutionPanel({
  events,
  teamId,
}: {
  events: PlayerStatEvent[];
  teamId?: string | null;
}) {
  const [filter, setFilter] = useState<PhaseFilter>(DEFAULT_PHASE_FILTER);
  const [selectedMatchId, setSelectedMatchId] = useState<string>("all");
  const [activeKeys, setActiveKeys] = useState<string[]>(["points", "attackEffPct", "errors"]);
  const [errorsOpen, setErrorsOpen] = useState(false);

  const matchOptions = useMemo(
    () => buildMatchOptions(events, teamId),
    [events, teamId]
  );

  const matchChipOptions = useMemo(
    () => [
      { id: "all", label: "Todos los partidos" },
      ...matchOptions.map((item) => ({ id: item.id, label: item.label })),
    ],
    [matchOptions]
  );

  const matchFiltered = useMemo(() => {
    if (selectedMatchId === "all") return events;
    return events.filter((event) => event.match_id === selectedMatchId);
  }, [events, selectedMatchId]);

  const filtered = useMemo(
    () =>
      filterEventsByPhase(
        matchFiltered,
        { sets: "all", possession: filter.possession },
        teamId
      ),
    [matchFiltered, filter.possession, teamId]
  );
  const series = useMemo(() => buildPlayerMatchSeries(filtered), [filtered]);
  const totals = useMemo(() => summarizePlayerSeries(series), [series]);
  const errorBreakdown = useMemo(() => errorBreakdownFromEvents(filtered), [filtered]);
  const metrics = EVOLUTION_METRICS.filter((item) => activeKeys.includes(item.key));

  function toggleMetric(key: string) {
    setActiveKeys((current) => {
      if (current.includes(key)) {
        return current.length === 1 ? current : current.filter((item) => item !== key);
      }
      return [...current, key];
    });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {matchChipOptions.length > 1 ? (
          <ChipRow
            options={matchChipOptions}
            value={selectedMatchId}
            onChange={setSelectedMatchId}
          />
        ) : null}
        <PhaseFilterBar
          value={filter}
          onChange={setFilter}
          showPossession={Boolean(teamId)}
          showSets={false}
        />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {EVOLUTION_METRICS.map((metric) => {
          const active = activeKeys.includes(metric.key);
          return (
            <button
              key={metric.key}
              type="button"
              onClick={() => toggleMetric(metric.key)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-semibold",
                active ? "text-white" : "bg-secondary text-muted-foreground"
              )}
              style={active ? { backgroundColor: metric.color } : undefined}
            >
              {metric.label}
            </button>
          );
        })}
      </div>

      <Card>
        <CardContent className="p-4">
          <PlayerEvolutionChart data={series} metrics={metrics} />
        </CardContent>
      </Card>

      <StatSummary
        items={[
          {
            label: "Acciones totales",
            value: filtered.length,
            accent: true,
          },
          { label: "Puntos", value: totals.points },
          {
            label: "Puntos de ataque",
            value: attackStatsFromEvents(filtered).kills,
          },
          {
            label: "Puntos de bloqueo",
            value: filtered.filter(
              (event) => event.point_type === "block" || event.point_type === "blockout"
            ).length,
          },
          {
            label: "Puntos de saque",
            value: serveStatsFromEvents(filtered).aces,
          },
          {
            label: "Errores",
            value: totals.errors,
            onClick: totals.errors > 0 ? () => setErrorsOpen(true) : undefined,
          },
          {
            label: "Eff. ataque",
            value: formatAttackEfficiency(attackStatsFromEvents(filtered).efficiency),
          },
        ]}
      />

      <ErrorBreakdownSheet
        open={errorsOpen}
        onOpenChange={setErrorsOpen}
        rows={errorBreakdown}
        total={totals.errors}
      />

      <AttackServeCards
        attack={attackStatsFromEvents(filtered)}
        serve={serveStatsFromEvents(filtered)}
        reception={receptionStatsFromEvents(filtered)}
        defense={defenseStatsFromEvents(filtered)}
      />

      <section>
        <h3 className="mb-3 text-base font-semibold">Partido a partido</h3>
        {series.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No hay acciones con este filtro.
          </p>
        ) : (
          <div className="space-y-2">
            {series.map((item) => (
              <MatchRow key={item.matchId} sample={item} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function MatchRow({ sample }: { sample: PlayerMatchSample }) {
  return (
    <Link
      href={`/partidos/${sample.matchId}`}
      className="block rounded-2xl border bg-card px-3 py-3"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold">{sample.label}</p>
        <p className="text-sm font-bold tabular-nums">{sample.points} pts</p>
      </div>
      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
        <span>ATK {formatAttackEfficiency(sample.attackEffPct === null ? null : sample.attackEffPct / 100)}</span>
        <span>{sample.aces} aces</span>
        <span>{sample.errors} err</span>
        <span>Rec {sample.receptionPct === null ? "—" : `${Math.round(sample.receptionPct)}%`}</span>
        <span>Def {sample.defensePct === null ? "—" : `${Math.round(sample.defensePct)}%`}</span>
        <span>{formatEfficiency(sample.efficiency)}</span>
      </div>
    </Link>
  );
}
