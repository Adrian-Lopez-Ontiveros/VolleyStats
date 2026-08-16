"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { EVOLUTION_METRICS, PlayerEvolutionChart } from "@/components/stats/charts";
import { PhaseFilterBar } from "@/components/stats/phase-filter";
import { AttackServeCards } from "@/components/stats/skill-stats";
import { StatSummary } from "@/components/stats/stat-summary";
import { Card, CardContent } from "@/components/ui/card";
import { DEFAULT_PHASE_FILTER, filterEventsByPhase, type PhaseFilter } from "@/lib/stat-filters";
import {
  buildPlayerMatchSeries,
  formatEfficiency,
  summarizePlayerSeries,
  type PlayerMatchSample,
} from "@/lib/stats";
import { cn } from "@/lib/utils";
import {
  attackStatsFromEvents,
  formatAttackEfficiency,
  receptionStatsFromEvents,
  serveStatsFromEvents,
} from "@/lib/volleyball-stats";
import type { PointType } from "@/lib/types";

export type PlayerStatEvent = {
  match_id: string;
  point_type: PointType;
  created_at: string;
  set_number?: number | null;
  serving_team_id?: string | null;
  match?: { scheduled_at?: string | null; status?: string | null } | null;
};

export function PlayerEvolutionPanel({
  events,
  teamId,
}: {
  events: PlayerStatEvent[];
  teamId?: string | null;
}) {
  const [filter, setFilter] = useState<PhaseFilter>(DEFAULT_PHASE_FILTER);
  const [activeKeys, setActiveKeys] = useState<string[]>(["points", "attackEffPct", "errors"]);

  const filtered = useMemo(
    () => filterEventsByPhase(events, filter, teamId),
    [events, filter, teamId]
  );
  const series = useMemo(() => buildPlayerMatchSeries(filtered), [filtered]);
  const totals = useMemo(() => summarizePlayerSeries(series), [series]);
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
      <PhaseFilterBar
        value={filter}
        onChange={setFilter}
        showPossession={Boolean(teamId)}
      />

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
          { label: "Puntos", value: totals.points, accent: true },
          { label: "Errores", value: totals.errors },
          { label: "Aces", value: totals.aces },
          {
            label: "Eff. ataque",
            value: formatAttackEfficiency(attackStatsFromEvents(filtered).efficiency),
          },
        ]}
      />

      <AttackServeCards
        attack={attackStatsFromEvents(filtered)}
        serve={serveStatsFromEvents(filtered)}
        reception={receptionStatsFromEvents(filtered)}
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
        <span>{formatEfficiency(sample.efficiency)}</span>
      </div>
    </Link>
  );
}
