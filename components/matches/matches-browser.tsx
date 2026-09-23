"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { CategoryNav, useCategoryFilter } from "@/components/category-nav";
import { FmvLeagueSearch } from "@/components/matches/fmv-league-search";
import { JornadaBar } from "@/components/matches/jornada-bar";
import { MatchViews } from "@/components/matches/match-views";
import { PageHeader } from "@/components/page-header";
import { QueryError } from "@/components/query-error";
import { StandingsTable } from "@/components/stats/standings-table";
import { Button } from "@/components/ui/button";
import { getCategoryMeta, type TeamCategory } from "@/lib/categories";
import { federationRoundNumber, standingsThroughJornada } from "@/lib/federation/rounds";
import type { MatchWithTeams } from "@/lib/types";

export function MatchesBrowser({
  matches,
  canManage,
  isGuest = false,
  initialCategory,
  loadError,
}: {
  matches: MatchWithTeams[];
  canManage: boolean;
  isGuest?: boolean;
  initialCategory: TeamCategory | "all";
  loadError?: string;
}) {
  const [categoria, setCategoria] = useCategoryFilter(initialCategory);
  const [jornada, setJornada] = useState<number | null>(null);
  const leagueCategory = categoria === "all" ? null : categoria;
  const categoryMatches = useMemo(
    () =>
      leagueCategory
        ? matches.filter(
            (match) =>
              match.home_team.category === leagueCategory ||
              match.away_team.category === leagueCategory
          )
        : [],
    [matches, leagueCategory]
  );
  const visibleMatches = useMemo(() => {
    if (jornada == null) return categoryMatches;
    return categoryMatches.filter(
      (match) => federationRoundNumber(match.federation_round) === jornada
    );
  }, [categoryMatches, jornada]);
  const standings = useMemo(
    () =>
      leagueCategory
        ? standingsThroughJornada(categoryMatches, leagueCategory, jornada)
        : null,
    [categoryMatches, leagueCategory, jornada]
  );

  function selectCategory(next: TeamCategory | "all") {
    setJornada(null);
    setCategoria(next);
  }

  const description = leagueCategory
    ? `${getCategoryMeta(leagueCategory).label}. Sin jornada ves el calendario y la clasificación actual. Al elegir una, ves sus partidos y la tabla al terminarla.`
    : "Busca cualquier liga de fmvoley. Las tres ligas del club siguen en sus pestañas.";

  return (
    <>
      <PageHeader
        title="Partidos"
        description={description}
        action={
          canManage ? (
            <Button asChild variant="accent" size="sm">
              <Link href="/partidos/nuevo">
                <Plus className="h-4 w-4" />
                Nuevo
              </Link>
            </Button>
          ) : null
        }
      />

      {!isGuest ? (
        <Link
          href="/predicciones"
          className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm"
        >
          <span>
            <span className="font-semibold text-orange-800">Predice la jornada.</span>{" "}
            <span className="text-orange-900/80">Elige ganador y suma XP si aciertas.</span>
          </span>
          <span className="shrink-0 font-bold text-orange-700">Predecir →</span>
        </Link>
      ) : null}

      <CategoryNav basePath="/partidos" value={categoria} allowAll onChange={selectCategory} />

      {loadError ? (
        <QueryError message={`No se pudieron cargar los partidos: ${loadError}`} />
      ) : null}

      {leagueCategory ? (
        <>
          <JornadaBar value={jornada} onChange={setJornada} />
          <MatchViews
            matches={visibleMatches}
            resetKey={`${leagueCategory}:${jornada ?? "all"}`}
            preferAll={jornada != null}
          />
          {standings ? (
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
                {standings.unfinished > 0
                  ? ` Todavía ${standings.unfinished === 1 ? "queda 1 partido" : `quedan ${standings.unfinished} partidos`} sin resultado hasta este punto.`
                  : ""}
              </p>
              {standings.rows.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Esta liga todavía no tiene partidos oficiales para calcular la tabla.
                </p>
              ) : (
                <StandingsTable rows={standings.rows} />
              )}
            </section>
          ) : null}
        </>
      ) : (
        <FmvLeagueSearch />
      )}
    </>
  );
}
