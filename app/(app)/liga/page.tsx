import type { Metadata } from "next";
import Link from "next/link";
import { Medal, Plus } from "lucide-react";
import { CategoryNav } from "@/components/category-nav";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { StandingsTable } from "@/components/stats/standings-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { QueryError } from "@/components/query-error";
import { requireViewer } from "@/lib/auth";
import { getCategoryMeta, parseCategory } from "@/lib/categories";
import { createClient } from "@/lib/supabase/server";
import { computeStandings } from "@/lib/stats";
import type { Match, Team } from "@/lib/types";

export const metadata: Metadata = { title: "Clasificación" };

export default async function LeaguePage({
  searchParams,
}: {
  searchParams: Promise<{ categoria?: string }>;
}) {
  const { categoria: rawCategory } = await searchParams;
  const { isAdmin } = await requireViewer();
  const categoria = parseCategory(rawCategory);
  const meta = getCategoryMeta(categoria);
  const supabase = await createClient();

  const [{ data: teams, error: teamsError }, { data: matches, error: matchesError }] =
    await Promise.all([
      supabase.from("teams").select("*").order("name"),
      supabase
        .from("matches")
        .select("home_team_id, away_team_id, status, home_sets, away_sets, set_scores")
        .eq("status", "finished"),
    ]);
  const loadError = teamsError?.message ?? matchesError?.message;

  const allTeams = (teams ?? []) as Team[];
  const typedTeams = allTeams
    .filter((team) => team.category === categoria)
    .sort((a, b) => Number(b.is_club_team) - Number(a.is_club_team) || a.name.localeCompare(b.name, "es"));
  const unassigned = isAdmin
    ? allTeams.filter((team) => !team.category && !team.is_club_team)
    : [];
  const teamIds = new Set(typedTeams.map((team) => team.id));
  const leagueMatches = ((matches ?? []) as Pick<
    Match,
    "home_team_id" | "away_team_id" | "status" | "home_sets" | "away_sets" | "set_scores"
  >[]).filter(
    (match) => teamIds.has(match.home_team_id) && teamIds.has(match.away_team_id)
  );

  const rows = computeStandings(typedTeams, leagueMatches);
  const rivals = typedTeams.filter((team) => !team.is_club_team);

  return (
    <>
      <PageHeader
        title="Clasificación"
        description={`${meta.label}. Tabla calculada con los partidos finalizados de esta liga.`}
        action={
          isAdmin ? (
            <Button asChild variant="accent" size="sm">
              <Link href={`/liga/rival?categoria=${categoria}`}>
                <Plus className="h-4 w-4" />
                Rival
              </Link>
            </Button>
          ) : null
        }
      />

      <CategoryNav basePath="/liga" value={categoria} />

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
                    <Link href={`/liga/rival?categoria=${categoria}`}>Añadir</Link>
                  </Button>
                </div>
                {rivals.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Todavía no hay rivales en {meta.label}.
                  </p>
                ) : (
                  <ul className="space-y-2">
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
