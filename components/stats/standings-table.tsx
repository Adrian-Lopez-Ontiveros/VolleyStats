import Link from "next/link";
import { TeamLogo } from "@/components/teams/team-logo";
import { formatSigned } from "@/lib/stats";
import type { StandingRow } from "@/lib/stats";

const COLUMNS = [
  { key: "played", label: "PJ", title: "Partidos jugados" },
  { key: "won", label: "G", title: "Ganados" },
  { key: "lost", label: "P", title: "Perdidos" },
  { key: "setsFor", label: "SF", title: "Sets a favor" },
  { key: "setsAgainst", label: "SC", title: "Sets en contra" },
  { key: "pointsFor", label: "PF", title: "Puntos a favor" },
  { key: "pointsAgainst", label: "PC", title: "Puntos en contra" },
] as const;

export function StandingsTable({ rows }: { rows: StandingRow[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-card">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-sm">
          <thead>
            <tr className="border-b bg-secondary/70 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <th className="sticky left-0 z-20 w-12 bg-secondary/95 px-2 py-3 text-center">#</th>
              <th className="sticky left-12 z-20 bg-secondary/95 px-2 py-3 text-left">Equipo</th>
              {COLUMNS.map((column) => (
                <th key={column.key} title={column.title} className="px-2 py-3 text-center">
                  {column.label}
                </th>
              ))}
              <th title="Diferencia de sets" className="px-2 py-3 text-center">
                DS
              </th>
              <th title="Diferencia de puntos" className="px-2 py-3 text-center">
                DP
              </th>
              <th title="Puntos de clasificación" className="px-3 py-3 text-center">
                Pts
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr
                key={row.team.id}
                className={`border-b last:border-0 ${index % 2 === 1 ? "bg-secondary/30" : "bg-card"}`}
              >
                <td
                  className={`sticky left-0 z-10 w-12 px-2 py-2.5 text-center font-bold tabular-nums ${
                    index % 2 === 1 ? "bg-secondary" : "bg-card"
                  }`}
                >
                  <PositionBadge position={row.position} />
                </td>
                <td
                  className={`sticky left-12 z-10 px-2 py-2.5 ${
                    index % 2 === 1 ? "bg-secondary" : "bg-card"
                  }`}
                >
                  <Link
                    href={`/equipos/${row.team.id}`}
                    className="flex min-w-[148px] items-center gap-2 font-semibold hover:underline"
                  >
                    <TeamLogo
                      name={row.team.name}
                      shortName={row.team.short_name}
                      logoUrl={row.team.logo_url}
                      size="sm"
                    />
                    <span className="truncate">{row.team.short_name || row.team.name}</span>
                  </Link>
                </td>
                {COLUMNS.map((column) => (
                  <td key={column.key} className="px-2 py-2.5 text-center tabular-nums">
                    {row[column.key]}
                  </td>
                ))}
                <td className="px-2 py-2.5 text-center tabular-nums">{formatSigned(row.setDiff)}</td>
                <td className="px-2 py-2.5 text-center tabular-nums">{formatSigned(row.pointDiff)}</td>
                <td className="px-3 py-2.5 text-center text-base font-bold tabular-nums text-primary">
                  {row.leaguePoints}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PositionBadge({ position }: { position: number }) {
  const tone =
    position === 1
      ? "bg-amber-100 text-amber-950"
      : position === 2
        ? "bg-slate-200 text-slate-800"
        : position === 3
          ? "bg-orange-100 text-orange-950"
          : "text-foreground";

  return (
    <span
      className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs ${tone}`}
    >
      {position}
    </span>
  );
}
