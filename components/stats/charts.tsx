"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { POINT_TYPE_META } from "@/lib/constants";
import type { PlayerMatchSample, PointTypeCounts, TeamMatchSample } from "@/lib/stats";
import type { PointType } from "@/lib/types";

const COLORS = {
  points: "#C4B5FD",
  away: "#EA580C",
  errors: "#E11D48",
  efficiency: "#0284C7",
  for: "#0B1F3A",
  against: "#94A3B8",
  grid: "#E2E8F0",
  axis: "#64748B",
};

const tooltipStyle = {
  borderRadius: 12,
  border: "1px solid #E2E8F0",
  boxShadow: "0 10px 24px -12px rgba(11,31,58,0.2)",
  fontSize: 12,
};

export type EvolutionMetric = {
  key: keyof PlayerMatchSample;
  label: string;
  color: string;
  axis: "count" | "pct";
};

export const EVOLUTION_METRICS: EvolutionMetric[] = [
  { key: "points", label: "Puntos", color: COLORS.points, axis: "count" },
  { key: "attackEffPct", label: "Eff. ataque", color: COLORS.efficiency, axis: "pct" },
  { key: "aces", label: "Aces", color: "#059669", axis: "count" },
  { key: "errors", label: "Errores", color: COLORS.errors, axis: "count" },
  { key: "receptionPct", label: "Recepción", color: COLORS.away, axis: "pct" },
];

export function PlayerEvolutionChart({
  data,
  metrics = EVOLUTION_METRICS.filter((item) =>
    ["points", "attackEffPct", "errors"].includes(item.key)
  ),
}: {
  data: PlayerMatchSample[];
  metrics?: EvolutionMetric[];
}) {
  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Todavía no hay partidos con estadísticas para graficar.
      </p>
    );
  }

  const showPct = metrics.some((item) => item.axis === "pct");
  const showCount = metrics.some((item) => item.axis === "count");

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid stroke={COLORS.grid} strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: COLORS.axis, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          {showCount ? (
            <YAxis
              yAxisId="count"
              allowDecimals={false}
              tick={{ fill: COLORS.axis, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={32}
            />
          ) : null}
          {showPct ? (
            <YAxis
              yAxisId="pct"
              orientation="right"
              domain={[-100, 100]}
              tick={{ fill: COLORS.axis, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={36}
              tickFormatter={(value) => `${value}%`}
            />
          ) : null}
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(value, name) => {
              if (value === null || value === undefined || Number.isNaN(Number(value))) {
                return ["—", name];
              }
              const numeric = typeof value === "number" ? value : Number(value);
              const metric = metrics.find((item) => item.label === name);
              if (metric?.axis === "pct") return [`${Math.round(numeric)}%`, name];
              return [numeric, name];
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {metrics.map((metric) => (
            <Line
              key={metric.key}
              yAxisId={metric.axis === "pct" ? "pct" : "count"}
              type="monotone"
              dataKey={metric.key}
              name={metric.label}
              stroke={metric.color}
              strokeWidth={2.4}
              connectNulls
              dot={{ r: 3, fill: metric.color }}
              activeDot={{ r: 5 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function PlayerCompareChart({
  rows,
}: {
  rows: { metric: string; [player: string]: string | number }[];
}) {
  if (rows.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Elige jugadores para comparar.
      </p>
    );
  }

  const keys = Object.keys(rows[0] ?? {}).filter((key) => key !== "metric");
  const palette = [COLORS.for, COLORS.away, "#7C3AED"];

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid stroke={COLORS.grid} strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="metric"
            tick={{ fill: COLORS.axis, fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            interval={0}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: COLORS.axis, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={32}
          />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {keys.map((key, index) => (
            <Bar
              key={key}
              dataKey={key}
              fill={palette[index % palette.length]}
              radius={[6, 6, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TeamPointsBarChart({ data }: { data: TeamMatchSample[] }) {
  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Aún no hay partidos finalizados para comparar puntos.
      </p>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid stroke={COLORS.grid} strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="opponent"
            tick={{ fill: COLORS.axis, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: COLORS.axis, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={32}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            labelFormatter={(_, payload) => {
              const row = payload?.[0]?.payload as TeamMatchSample | undefined;
              return row ? `vs ${row.opponent} · ${row.label}` : "";
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="pointsFor" name="A favor" fill={COLORS.for} radius={[6, 6, 0, 0]} />
          <Bar dataKey="pointsAgainst" name="En contra" fill={COLORS.against} radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function PointTypeBarChart({
  home,
  away,
  homeLabel,
  awayLabel,
}: {
  home: PointTypeCounts;
  away: PointTypeCounts;
  homeLabel: string;
  awayLabel: string;
}) {
  const keys: PointType[] = ["attack", "block", "ace", "error", "opponent_error", "other"];
  const data = keys.map((type) => ({
    type: POINT_TYPE_META[type].label,
    [homeLabel]: home[type],
    [awayLabel]: away[type],
  }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid stroke={COLORS.grid} strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="type"
            tick={{ fill: COLORS.axis, fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            interval={0}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: COLORS.axis, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={32}
          />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey={homeLabel} fill={COLORS.for} radius={[6, 6, 0, 0]} />
          <Bar dataKey={awayLabel} fill={COLORS.away} radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}


