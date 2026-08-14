import Link from "next/link";
import { TeamLogo } from "@/components/teams/team-logo";
import { cn } from "@/lib/utils";
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

function rowTone(index: number) {
  return index % 2 === 1 ? "bg-secondary" : "bg-card";
}

const stickyEdge =
  "shadow-[6px_0_8px_-6px_rgba(15,23,42,0.18)]";

export function StandingsTable({ rows }: { rows: StandingRow[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-card">
      <div className="overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]">
        <table className="w-max min-w-full border-collapse text-sm">
          <thead>
            <tr className="border-b bg-secondary text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <th className="sticky left-0 z-20 w-10 bg-secondary px-1.5 py-3 text-center md:w-12 md:px-3">
                #
              </th>
              <th className="sticky left-10 z-20 w-36 bg-secondary px-2 py-3 text-left md:left-12 md:w-60 md:px-3">
                Equipo
              </th>
              <th
                title="Puntos de clasificación"
                className={cn(
                  "sticky left-[11.5rem] z-20 w-12 bg-secondary px-1.5 py-3 text-center md:left-[18rem] md:w-14 md:px-3",
                  stickyEdge
                )}
              >
                Pts
              </th>
              {DETAIL_COLUMNS.map((column) => (
                <th
                  key={column.key}
                  title={column.title}
                  className="whitespace-nowrap px-2.5 py-3 text-center"
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const tone = rowTone(index);
              return (
                <tr key={row.team.id} className={cn("border-b last:border-0", tone)}>
                  <td className={cn("sticky left-0 z-10 w-10 px-1.5 py-2.5 text-center md:w-12 md:px-3", tone)}>
                    <PositionBadge position={row.position} />
                  </td>
                  <td
                    className={cn(
                      "sticky left-10 z-10 w-36 px-2 py-2.5 md:left-12 md:w-60 md:px-3",
                      tone
                    )}
                  >
                    <TeamName row={row} />
                  </td>
                  <td
                    className={cn(
                      "sticky left-[11.5rem] z-10 w-12 px-1.5 py-2.5 text-center md:left-[18rem] md:w-14 md:px-3",
                      stickyEdge,
                      tone
                    )}
                  >
                    <span className="text-base font-black tabular-nums text-primary md:text-lg">
                      {row.leaguePoints}
                    </span>
                  </td>
                  {DETAIL_COLUMNS.map((column) => (
                    <td
                      key={column.key}
                      className="whitespace-nowrap px-2.5 py-2.5 text-center tabular-nums"
                    >
                      {column.signed ? formatSigned(row[column.key]) : row[column.key]}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TeamName({ row }: { row: StandingRow }) {
  return (
    <Link href={`/equipos/${row.team.id}`} className="flex items-center gap-2 hover:underline">
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
