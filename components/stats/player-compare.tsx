"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PlayerCompareChart } from "@/components/stats/charts";
import { PhaseFilterBar } from "@/components/stats/phase-filter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { DEFAULT_PHASE_FILTER, filterEventsByPhase, type PhaseFilter } from "@/lib/stat-filters";
import { formatJersey, initials } from "@/lib/utils";
import {
  attackStatsFromEvents,
  formatAttackEfficiency,
  formatSkillRate,
  receptionStatsFromEvents,
  serveStatsFromEvents,
} from "@/lib/volleyball-stats";
import { isOwnErrorType, isScoringAction, scoresForActingTeam } from "@/lib/volleyball";
import type { PointType } from "@/lib/types";

export type ComparePlayer = {
  id: string;
  full_name: string;
  jersey_number: number | null;
  avatar_url: string | null;
  team_id: string | null;
  teamName: string;
};

export type CompareEvent = {
  player_id: string;
  point_type: PointType;
  set_number?: number | null;
  serving_team_id?: string | null;
};

type CompareRow = {
  player: ComparePlayer;
  points: number;
  errors: number;
  blocks: number;
  attackLabel: string;
  serveLabel: string;
  receptionLabel: string;
  aces: number;
  chart: {
    points: number;
    attack: number;
    aces: number;
    errors: number;
    reception: number;
  };
};

const COMPARE_COLORS = ["#0B1F3A", "#EA580C", "#7C3AED"];

export function PlayerCompare({
  players,
  events,
  initialIds = [],
}: {
  players: ComparePlayer[];
  events: CompareEvent[];
  initialIds?: string[];
}) {
  const [selected, setSelected] = useState<string[]>(
    initialIds.filter((id) => players.some((player) => player.id === id)).slice(0, 3)
  );
  const [filter, setFilter] = useState<PhaseFilter>(DEFAULT_PHASE_FILTER);

  const rows = useMemo(() => {
    return selected
      .map((id) => players.find((player) => player.id === id))
      .filter((player): player is ComparePlayer => Boolean(player))
      .map((player) => {
        const playerEvents = filterEventsByPhase(
          events.filter((event) => event.player_id === player.id),
          filter,
          player.team_id
        );
        const attack = attackStatsFromEvents(playerEvents);
        const serve = serveStatsFromEvents(playerEvents);
        const reception = receptionStatsFromEvents(playerEvents);
        let points = 0;
        let errors = 0;
        let blocks = 0;
        for (const event of playerEvents) {
          if (isOwnErrorType(event.point_type)) errors += 1;
          else if (isScoringAction(event.point_type) && scoresForActingTeam(event.point_type)) {
            points += 1;
          }
          if (event.point_type === "block") blocks += 1;
        }
        return {
          player,
          points,
          errors,
          blocks,
          aces: serve.aces,
          attackLabel: formatAttackEfficiency(attack.efficiency),
          serveLabel: `${formatSkillRate(serve.successRate)} · ${serve.aces} aces`,
          receptionLabel: formatSkillRate(reception.goodRate),
          chart: {
            points,
            attack: attack.efficiency === null ? 0 : Math.round(attack.efficiency * 100),
            aces: serve.aces,
            errors,
            reception: reception.goodRate === null ? 0 : Math.round(reception.goodRate * 100),
          },
        } satisfies CompareRow;
      });
  }, [selected, players, events, filter]);

  const chartRows = useMemo(() => {
    if (rows.length === 0) return [];
    const metrics = [
      { key: "points" as const, label: "Puntos" },
      { key: "attack" as const, label: "ATK%" },
      { key: "aces" as const, label: "Aces" },
      { key: "errors" as const, label: "Errores" },
      { key: "reception" as const, label: "Rec%" },
    ];
    return metrics.map((metric) => {
      const row: { metric: string; [name: string]: string | number } = { metric: metric.label };
      for (const item of rows) {
        row[shortName(item.player)] = item.chart[metric.key];
      }
      return row;
    });
  }, [rows]);

  function toggle(id: string) {
    setSelected((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      if (current.length >= 3) return [...current.slice(1), id];
      return [...current, id];
    });
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Elige 2 o 3 jugadores para compararlos. Las barras de ATK% y Rec% van de −100 a 100 y 0 a 100.
      </p>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {players.map((player) => {
          const active = selected.includes(player.id);
          const index = selected.indexOf(player.id);
          return (
            <button
              key={player.id}
              type="button"
              onClick={() => toggle(player.id)}
              className="min-w-[9.5rem] rounded-2xl border bg-card px-3 py-2 text-left"
              style={
                active
                  ? { borderColor: COMPARE_COLORS[index], boxShadow: `inset 0 0 0 1px ${COMPARE_COLORS[index]}` }
                  : undefined
              }
            >
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={player.avatar_url ?? undefined} alt={player.full_name} />
                  <AvatarFallback>{initials(player.full_name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold">
                    {formatJersey(player.jersey_number)} {player.full_name}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">{player.teamName}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <PhaseFilterBar value={filter} onChange={setFilter} showPossession />

      {rows.length < 2 ? (
        <p className="text-sm text-muted-foreground">Selecciona al menos dos jugadores.</p>
      ) : (
        <>
          <Card>
            <CardContent className="p-4">
              <PlayerCompareChart rows={chartRows} />
            </CardContent>
          </Card>

          <div className="grid gap-3 sm:grid-cols-3">
            {rows.map((row, index) => (
              <Link key={row.player.id} href={`/jugadores/${row.player.id}`}>
                <Card className="h-full">
                  <CardContent className="space-y-2 p-4">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: COMPARE_COLORS[index] }}
                      />
                      <p className="truncate text-sm font-semibold">
                        {formatJersey(row.player.jersey_number)} {row.player.full_name}
                      </p>
                    </div>
                    <CompareLine label="Puntos" value={String(row.points)} />
                    <CompareLine label="Eff. ataque" value={row.attackLabel} />
                    <CompareLine label="Aces" value={String(row.aces)} />
                    <CompareLine label="Errores" value={String(row.errors)} />
                    <CompareLine label="Bloqueos" value={String(row.blocks)} />
                    <CompareLine label="Saque" value={row.serveLabel} />
                    <CompareLine label="Recepción" value={row.receptionLabel} />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          <div className="overflow-hidden rounded-2xl border bg-card">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="border-b bg-secondary/70 text-[11px] uppercase tracking-wide text-muted-foreground">
                    <th className="px-3 py-3 text-left">Métrica</th>
                    {rows.map((row) => (
                      <th key={row.player.id} className="px-3 py-3 text-center">
                        {shortName(row.player)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Puntos", rows.map((row) => String(row.points))],
                    ["Eff. ataque", rows.map((row) => row.attackLabel)],
                    ["Aces", rows.map((row) => String(row.aces))],
                    ["Errores", rows.map((row) => String(row.errors))],
                    ["Bloqueos", rows.map((row) => String(row.blocks))],
                    ["Saque", rows.map((row) => row.serveLabel)],
                    ["Recepción", rows.map((row) => row.receptionLabel)],
                  ].map(([label, values]) => (
                    <tr key={label as string} className="border-b last:border-0">
                      <td className="px-3 py-2.5 font-medium">{label}</td>
                      {(values as string[]).map((value, index) => (
                        <td key={`${label}-${index}`} className="px-3 py-2.5 text-center tabular-nums">
                          {value}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function shortName(player: ComparePlayer) {
  const first = player.full_name.split(" ")[0];
  return player.jersey_number != null ? `#${player.jersey_number} ${first}` : first;
}

function CompareLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  );
}
