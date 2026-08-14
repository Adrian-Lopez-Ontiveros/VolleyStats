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

export function PlayerEvolutionChart({ data }: { data: PlayerMatchSample[] }) {
  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Todavía no hay partidos con estadísticas para graficar.
      </p>
    );
  }

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
          <YAxis
            yAxisId="count"
            allowDecimals={false}
            tick={{ fill: COLORS.axis, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={32}
          />
          <YAxis
            yAxisId="eff"
            orientation="right"
            domain={[-100, 100]}
            tick={{ fill: COLORS.axis, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={36}
            tickFormatter={(value) => `${value}%`}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(value, name) => {
              const numeric = typeof value === "number" ? value : Number(value);
              if (name === "Eficiencia") return [`${Math.round(numeric)}%`, name];
              return [numeric, name];
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line
            yAxisId="count"
            type="monotone"
            dataKey="points"
            name="Puntos"
            stroke={COLORS.points}
            strokeWidth={2.4}
            dot={{ r: 3, fill: COLORS.points }}
            activeDot={{ r: 5 }}
          />
          <Line
            yAxisId="count"
            type="monotone"
            dataKey="errors"
            name="Errores"
            stroke={COLORS.errors}
            strokeWidth={2.4}
            dot={{ r: 3, fill: COLORS.errors }}
          />
          <Line
            yAxisId="eff"
            type="monotone"
            dataKey="efficiency"
            name="Eficiencia"
            stroke={COLORS.efficiency}
            strokeWidth={2}
            strokeDasharray="5 4"
            dot={{ r: 3, fill: COLORS.efficiency }}
          />
        </LineChart>
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

export function PlayerSparkline({ data }: { data: PlayerMatchSample[] }) {
  if (data.length < 2) {
    return <span className="text-[11px] text-muted-foreground">—</span>;
  }

  return (
    <div className="h-8 w-20">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <Line
            type="monotone"
            dataKey="points"
            stroke={COLORS.points}
            strokeWidth={1.8}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
