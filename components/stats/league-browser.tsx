"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Medal, Plus } from "lucide-react";
import { CategoryNav, useCategoryFilter } from "@/components/category-nav";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { QueryError } from "@/components/query-error";
import { StandingsTable } from "@/components/stats/standings-table";
import { ExportCsvButton } from "@/components/export-csv-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getCategoryMeta, parseCategory, type TeamCategory } from "@/lib/categories";
import { computeStandings, type MatchStandingInput } from "@/lib/stats";
import type { Team } from "@/lib/types";

export function LeagueBrowser({
  teams,
  matches,
  isAdmin,
  initialCategory,
  loadError,
}: {
  teams: Team[];
  matches: MatchStandingInput[];
  isAdmin: boolean;
  initialCategory: TeamCategory;
  loadError?: string;
}) {
  const [categoria, setCategoria] = useCategoryFilter(initialCategory);
  const activeCategory = parseCategory(typeof categoria === "string" ? categoria : initialCategory);
  const meta = getCategoryMeta(activeCategory);

  const typedTeams = useMemo(
    () =>
      teams
        .filter((team) => team.category === activeCategory)
        .sort(
          (a, b) =>
            Number(b.is_club_team) - Number(a.is_club_team) || a.name.localeCompare(b.name, "es")
        ),
    [teams, activeCategory]
  );
  const unassigned = useMemo(
    () => (isAdmin ? teams.filter((team) => !team.category && !team.is_club_team) : []),
    [teams, isAdmin]
  );
  const rows = useMemo(() => {
    const teamIds = new Set(typedTeams.map((team) => team.id));
    const leagueMatches = matches.filter(
      (match) => teamIds.has(match.home_team_id) && teamIds.has(match.away_team_id)
    );
    return computeStandings(typedTeams, leagueMatches);
  }, [typedTeams, matches]);
  const rivals = useMemo(
    () => typedTeams.filter((team) => !team.is_club_team),
    [typedTeams]
  );

  return (
    <>
      <PageHeader
        title="Clasificación"
        description={`${meta.label}. Tabla calculada con los partidos finalizados de esta liga.`}
        action={
          <div className="flex flex-wrap justify-end gap-2">
            <ExportCsvButton
              filename={`clasificacion-${activeCategory}`}
              rows={[
                ["Pos", "Equipo", "Pts", "PJ", "G", "P", "SF", "SC", "PF", "PC"],
                ...rows.map((row) => [
                  row.position,
                  row.team.name,
                  row.leaguePoints,
                  row.played,
                  row.won,
                  row.lost,
                  row.setsFor,
                  row.setsAgainst,
                  row.pointsFor,
                  row.pointsAgainst,
                ]),
              ]}
            />
            {isAdmin ? (
              <Button asChild variant="accent" size="sm">
                <Link href={`/liga/rival?categoria=${activeCategory}`}>
                  <Plus className="h-4 w-4" />
                  Rival
                </Link>
              </Button>
            ) : null}
          </div>
        }
      />

      <CategoryNav basePath="/liga" value={activeCategory} onChange={setCategoria} />

      {loadError ? (
        <QueryError message={`No se pudo cargar la clasificación: ${loadError}`} />
      ) : null}

      {unassigned.length > 0 ? (
        <Card className="mb-4">
          <CardContent className="space-y-3 p-4">
            <div>
              <p className="text-sm font-semibold">Equipos sin liga</p>
              <p className="text-xs text-muted-foreground">
                Asígnales categoría para que entren en una de las 3 clasificaciones.
              </p>
            </div>
            <ul className="space-y-2">
              {unassigned.map((team) => (
                <li key={team.id}>
                  <Link
                    href={`/equipos/${team.id}/editar`}
                    className="flex items-center justify-between rounded-xl border bg-background px-3 py-2 text-sm"
                  >
                    <span className="font-medium">{team.name}</span>
                    <span className="text-xs text-muted-foreground">Asignar</span>
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      {rows.length === 0 ? (
        <EmptyState
          icon={Medal}
          title={`Sin equipos en ${meta.label}`}
          description={
            isAdmin
              ? "Crea el equipo del club en Equipos y añade aquí a los rivales de esta liga."
              : "Cuando existan equipos de esta liga aparecerán ordenados por los resultados."
          }
        />
      ) : (
        <div className="space-y-4">
          <StandingsTable rows={rows} />

          {isAdmin ? (
            <Card>
              <CardContent className="space-y-3 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">Rivales de esta liga</p>
                    <p className="text-xs text-muted-foreground">
                      Se guardan aquí. No aparecen en la pantalla principal de Equipos.
                    </p>
                  </div>
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/liga/rival?categoria=${activeCategory}`}>Añadir</Link>
                  </Button>
                </div>
                {rivals.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Todavía no hay rivales en {meta.label}.
                  </p>
                ) : (
                  <ul className="grid gap-2 lg:grid-cols-2 xl:grid-cols-3">
                    {rivals.map((team) => (
                      <li key={team.id}>
                        <Link
                          href={`/equipos/${team.id}`}
                          className="flex items-center justify-between rounded-xl border bg-background px-3 py-2 text-sm"
                        >
                          <span className="font-medium">{team.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {team.short_name || team.city || "Ver ficha"}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardContent className="space-y-2 p-4 text-xs leading-relaxed text-muted-foreground">
              <p>
                <span className="font-semibold text-foreground">Pts</span> de clasificación: 3
                puntos por ganar 3-0 o 3-1, 2 por ganar 3-2, 1 por perder 2-3 y 0 en el resto.
              </p>
              <p>
                Desempate: puntos de liga, partidos ganados, diferencia de sets, cociente de
                sets y diferencia de puntos de set.
              </p>
              <p>
                PJ partidos · G ganados · P perdidos · SF/SC sets · PF/PC puntos de set · DS/DP
                diferencias.
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
