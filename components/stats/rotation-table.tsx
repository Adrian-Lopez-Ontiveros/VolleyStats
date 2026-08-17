import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  bestAndWorstRotations,
  formatAttackEfficiency,
  formatSkillRate,
  type RotationRow,
} from "@/lib/volleyball-stats";

export function RotationTable({
  rows,
  title = "Rendimiento por rotación",
}: {
  rows: RotationRow[];
  title?: string;
}) {
  const { best, worst } = bestAndWorstRotations(rows);
  const hasData = rows.some(
    (row) => row.pointsFor + row.pointsAgainst + row.attack.attempts + row.errors > 0
  );

  if (!hasData) {
    return (
      <p className="text-sm text-muted-foreground">
        Todavía no hay acciones con rotación registrada. En el seguimiento, elige R1–R6
        antes de anotar.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-2xl border bg-card shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b bg-secondary/70 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-3 text-left">{title}</th>
                <th className="px-2 py-3 text-center">PF</th>
                <th className="px-2 py-3 text-center">PC</th>
                <th className="px-2 py-3 text-center">Dif</th>
                <th className="px-2 py-3 text-center">Recibiendo</th>
                <th className="px-2 py-3 text-center">Con saque</th>
                <th className="px-2 py-3 text-center">Err</th>
                <th className="px-2 py-3 text-center">ATK%</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const active =
                  row.pointsFor + row.pointsAgainst + row.attack.attempts + row.errors > 0;
                const diff = row.pointsFor - row.pointsAgainst;
                return (
                  <tr
                    key={row.rotation}
                    className={cn(
                      "border-b last:border-0",
                      best?.rotation === row.rotation && "bg-emerald-50",
                      worst?.rotation === row.rotation &&
                        best?.rotation !== row.rotation &&
                        "bg-rose-50",
                      !active && "opacity-50"
                    )}
                  >
                    <td className="px-3 py-2.5 font-semibold">R{row.rotation}</td>
                    <td className="px-2 py-2.5 text-center tabular-nums">{row.pointsFor}</td>
                    <td className="px-2 py-2.5 text-center tabular-nums">{row.pointsAgainst}</td>
                    <td className="px-2 py-2.5 text-center font-semibold tabular-nums">
                      {active ? `${diff > 0 ? "+" : ""}${diff}` : "—"}
                    </td>
                    <td className="px-2 py-2.5 text-center tabular-nums">
                      {formatSkillRate(row.sideOut.rate)}
                    </td>
                    <td className="px-2 py-2.5 text-center tabular-nums">
                      {formatSkillRate(row.breakPoint.rate)}
                    </td>
                    <td className="px-2 py-2.5 text-center tabular-nums">{row.errors}</td>
                    <td className="px-2 py-2.5 text-center font-semibold tabular-nums">
                      {formatAttackEfficiency(row.attack.efficiency)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      {best && worst && best.rotation !== worst.rotation ? (
        <p className="text-xs text-muted-foreground">
          Mejor rotación <span className="font-semibold text-emerald-800">R{best.rotation}</span>
          {" · "}
          Más floja <span className="font-semibold text-rose-800">R{worst.rotation}</span>
        </p>
      ) : null}
    </div>
  );
}

export function RotationSummaryCards({ rows }: { rows: RotationRow[] }) {
  const { best, worst } = bestAndWorstRotations(rows);
  if (!best) return null;

  return (
    <div className="grid grid-cols-2 gap-3">
      <Card>
        <CardContent className="p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Mejor rotación
          </p>
          <p className="mt-1 text-2xl font-bold">R{best.rotation}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {best.pointsFor}-{best.pointsAgainst} · Recibiendo {formatSkillRate(best.sideOut.rate)}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Rotación a mejorar
          </p>
          <p className="mt-1 text-2xl font-bold">R{worst?.rotation ?? "—"}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {worst
              ? `${worst.pointsFor}-${worst.pointsAgainst} · Recibiendo ${formatSkillRate(worst.sideOut.rate)}`
              : "Sin datos"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
