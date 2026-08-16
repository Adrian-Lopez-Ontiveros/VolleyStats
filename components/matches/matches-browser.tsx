"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Trophy } from "lucide-react";
import { CategoryNav, useCategoryFilter } from "@/components/category-nav";
import { EmptyState } from "@/components/empty-state";
import { MatchCard } from "@/components/matches/match-card";
import { PageHeader } from "@/components/page-header";
import { QueryError } from "@/components/query-error";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { TeamCategory } from "@/lib/categories";
import type { MatchWithTeams } from "@/lib/types";

export function MatchesBrowser({
  matches,
  isAdmin,
  initialCategory,
  loadError,
}: {
  matches: MatchWithTeams[];
  isAdmin: boolean;
  initialCategory: TeamCategory | "all";
  loadError?: string;
}) {
  const [categoria, setCategoria] = useCategoryFilter(initialCategory);
  const filtered = useMemo(
    () =>
      categoria === "all"
        ? matches
        : matches.filter(
            (match) =>
              match.home_team.category === categoria || match.away_team.category === categoria
          ),
    [matches, categoria]
  );
  const live = useMemo(
    () => filtered.filter((match) => match.status === "live"),
    [filtered]
  );
  const upcoming = useMemo(
    () => filtered.filter((match) => match.status === "scheduled"),
    [filtered]
  );
  const past = useMemo(
    () =>
      filtered.filter(
        (match) => match.status === "finished" || match.status === "cancelled"
      ),
    [filtered]
  );
  const defaultTab = live.length ? "live" : upcoming.length ? "upcoming" : "all";
  const [tab, setTab] = useState(defaultTab);

  useEffect(() => {
    setTab(live.length ? "live" : upcoming.length ? "upcoming" : "all");
  }, [categoria, live.length, upcoming.length]);
  const lists = {
    all: { matches: filtered, empty: "Todavía no hay partidos." },
    live: { matches: live, empty: "No hay partidos en curso." },
    upcoming: { matches: upcoming, empty: "No hay partidos programados." },
    past: { matches: past, empty: "Aún no hay partidos finalizados." },
  } as const;
  const active = lists[tab as keyof typeof lists] ?? lists.all;

  return (
    <>
      <PageHeader
        title="Partidos"
        description="Próximos, en curso y finalizados."
        action={
          isAdmin ? (
            <Button asChild variant="accent" size="sm">
              <Link href="/partidos/nuevo">
                <Plus className="h-4 w-4" />
                Nuevo
              </Link>
            </Button>
          ) : null
        }
      />

      <CategoryNav
        basePath="/partidos"
        value={categoria}
        allowAll
        onChange={setCategoria}
      />

      {loadError ? (
        <QueryError message={`No se pudieron cargar los partidos: ${loadError}`} />
      ) : null}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">Todos</TabsTrigger>
          <TabsTrigger value="live">En vivo</TabsTrigger>
          <TabsTrigger value="upcoming">Próximos</TabsTrigger>
          <TabsTrigger value="past">Pasados</TabsTrigger>
        </TabsList>
        <TabsContent value={tab}>
          <MatchList matches={active.matches} empty={active.empty} />
        </TabsContent>
      </Tabs>
    </>
  );
}

function MatchList({
  matches,
  empty = "Todavía no hay partidos.",
}: {
  matches: MatchWithTeams[];
  empty?: string;
}) {
  if (matches.length === 0) {
    return (
      <EmptyState
        icon={Trophy}
        title="Sin partidos"
        description={empty}
      />
    );
  }

  return (
    <div className="space-y-3">
      {matches.map((match) => (
        <MatchCard key={match.id} match={match} />
      ))}
    </div>
  );
}
