import { StandingsTable } from "@/components/stats/standings-table";
import type { StandingRow } from "@/lib/stats";

export function LeagueStandings({
  jornada,
  rows,
  unfinished,
}: {
  jornada: number | null;
  rows: StandingRow[];
  unfinished: number;
}) {
  return (
    <section className="mt-6 space-y-2">
      <h2 className="text-sm font-semibold">
        {jornada == null
          ? "Clasificación actual"
          : `Clasificación al finalizar la jornada ${jornada}`}
      </h2>
      <p className="text-xs text-muted-foreground">
        {jornada == null
          ? "Calculada con los partidos de liga ya finalizados."
          : `Cuenta los partidos finalizados de la jornada 1 a la ${jornada}.`}
        {unfinished > 0
          ? ` Todavía ${unfinished === 1 ? "queda 1 partido" : `quedan ${unfinished} partidos`} sin resultado hasta este punto.`
          : ""}
      </p>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Esta liga todavía no tiene partidos oficiales para calcular la tabla.
        </p>
      ) : (
        <StandingsTable rows={rows} />
      )}
    </section>
  );
}
