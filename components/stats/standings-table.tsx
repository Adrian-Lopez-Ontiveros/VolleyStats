import Link from "next/link";
import { TeamLogo } from "@/components/teams/team-logo";
import { formatSigned } from "@/lib/stats";
import type { StandingRow } from "@/lib/stats";

const DETAIL_COLUMNS: {
  key: keyof Pick<
    StandingRow,
    | "played"
    | "won"
    | "lost"
    | "setsFor"
    | "setsAgainst"
    | "setDiff"
    | "pointsFor"
    | "pointsAgainst"
    | "pointDiff"
  >;
  label: string;
  title: string;
  signed?: boolean;
}[] = [
  { key: "played", label: "PJ", title: "Partidos jugados" },
  { key: "won", label: "G", title: "Ganados" },
  { key: "lost", label: "P", title: "Perdidos" },
  { key: "setsFor", label: "SF", title: "Sets a favor" },
  { key: "setsAgainst", label: "SC", title: "Sets en contra" },
  { key: "setDiff", label: "DS", title: "Diferencia de sets", signed: true },
  { key: "pointsFor", label: "PF", title: "Puntos a favor" },
  { key: "pointsAgainst", label: "PC", title: "Puntos en contra" },
  { key: "pointDiff", label: "DP", title: "Diferencia de puntos", signed: true },
];

export function StandingsTable({ rows }: { rows: StandingRow[] }) {
  return (
    <>
      <div className="space-y-2 md:hidden">
        {rows.map((row) => (
          <StandingsCard key={row.team.id} row={row} />
        ))}
      </div>

      <div className="hidden overflow-hidden rounded-2xl border bg-card shadow-card md:block">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b bg-secondary/70 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                <th className="w-12 px-3 py-3 text-center">#</th>
                <th className="px-3 py-3 text-left">Equipo</th>
                <th title="Puntos de clasificación" className="px-3 py-3 text-center">
                  Pts
                </th>
                {DETAIL_COLUMNS.map((column) => (
                  <th key={column.key} title={column.title} className="px-2 py-3 text-center">
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr
                  key={row.team.id}
                  className={`border-b last:border-0 ${index % 2 === 1 ? "bg-secondary/30" : "bg-card"}`}
                >
                  <td className="px-3 py-3 text-center">
                    <PositionBadge position={row.position} />
                  </td>
                  <td className="px-3 py-3">
                    <TeamName row={row} />
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span className="text-lg font-black tabular-nums text-primary">
                      {row.leaguePoints}
                    </span>
                  </td>
                  {DETAIL_COLUMNS.map((column) => (
                    <td key={column.key} className="px-2 py-3 text-center tabular-nums">
                      {column.signed
                        ? formatSigned(row[column.key])
                        : row[column.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

const MOBILE_STATS: {
  key: keyof Pick<
    StandingRow,
    | "played"
    | "won"
    | "lost"
    | "setsFor"
    | "setsAgainst"
    | "setDiff"
    | "pointsFor"
    | "pointsAgainst"
    | "pointDiff"
  >;
  label: string;
  signed?: boolean;
}[] = [
  { key: "played", label: "PJ" },
  { key: "won", label: "G" },
  { key: "lost", label: "P" },
  { key: "setsFor", label: "SF" },
  { key: "setsAgainst", label: "SC" },
  { key: "setDiff", label: "DS", signed: true },
  { key: "pointsFor", label: "PF" },
  { key: "pointsAgainst", label: "PC" },
  { key: "pointDiff", label: "DP", signed: true },
];

function StandingsCard({ row }: { row: StandingRow }) {
  return (
    <Link
      href={`/equipos/${row.team.id}`}
      className="block rounded-2xl border bg-card px-3 py-3 shadow-card active:scale-[0.99]"
    >
      <div className="flex items-center gap-3">
        <PositionBadge position={row.position} />
        <div className="w-12 shrink-0 text-center">
          <p className="text-2xl font-black leading-none tabular-nums text-primary">
            {row.leaguePoints}
          </p>
          <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            pts
          </p>
        </div>
        <TeamLogo
          name={row.team.name}
          shortName={row.team.short_name}
          logoUrl={row.team.logo_url}
          size="sm"
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-snug">{row.team.name}</p>
          {row.team.short_name ? (
            <p className="text-[11px] text-muted-foreground">{row.team.short_name}</p>
          ) : null}
        </div>
      </div>
      <dl className="mt-3 grid grid-cols-3 gap-1.5">
        {MOBILE_STATS.map((stat) => (
          <div key={stat.key} className="rounded-xl bg-secondary/70 px-1.5 py-1.5 text-center">
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {stat.label}
            </dt>
            <dd className="text-sm font-semibold tabular-nums">
              {stat.signed ? formatSigned(row[stat.key]) : row[stat.key]}
            </dd>
          </div>
        ))}
      </dl>
    </Link>
  );
}

function TeamName({ row }: { row: StandingRow }) {
  return (
    <Link href={`/equipos/${row.team.id}`} className="flex min-w-[220px] items-center gap-2.5 hover:underline">
      <TeamLogo
        name={row.team.name}
        shortName={row.team.short_name}
        logoUrl={row.team.logo_url}
        size="sm"
      />
      <span className="min-w-0">
        <span className="block font-semibold leading-tight">{row.team.name}</span>
        {row.team.short_name ? (
          <span className="block text-[11px] font-normal text-muted-foreground">
            {row.team.short_name}
          </span>
        ) : null}
      </span>
    </Link>
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
      className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${tone}`}
    >
      {position}
    </span>
  );
}
