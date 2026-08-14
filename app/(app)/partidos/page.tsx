import Link from "next/link";
import { Plus, Trophy } from "lucide-react";
import { CategoryNav } from "@/components/category-nav";
import { EmptyState } from "@/components/empty-state";
import { MatchCard } from "@/components/matches/match-card";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QueryError } from "@/components/query-error";
import { requireViewer } from "@/lib/auth";
import { isTeamCategory } from "@/lib/categories";
import { MATCH_WITH_TEAMS_SELECT } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import type { MatchWithTeams } from "@/lib/types";

export default async function MatchesPage({
  searchParams,
}: {
  searchParams: Promise<{ categoria?: string }>;
}) {
  const { categoria: rawCategory } = await searchParams;
  const { isAdmin } = await requireViewer();
  const categoria = isTeamCategory(rawCategory) ? rawCategory : "all";
  const supabase = await createClient();
  const [{ data, error: matchesError }, { data: teams, error: teamsError }] =
    await Promise.all([
      supabase
        .from("matches")
        .select(MATCH_WITH_TEAMS_SELECT as "*")
        .order("scheduled_at", { ascending: false }),
      supabase.from("teams").select("*"),
    ]);
  const loadError = matchesError?.message ?? teamsError?.message;

  const categoryByTeam = new Map(
    ((teams ?? []) as { id: string; category?: string | null }[]).map((team) => [
      team.id,
      team.category ?? null,
    ])
  );
  const allMatches = (data ?? []) as MatchWithTeams[];
  const matches =
    categoria === "all"
      ? allMatches
      : allMatches.filter(
          (match) =>
            categoryByTeam.get(match.home_team_id) === categoria ||
            categoryByTeam.get(match.away_team_id) === categoria
        );
  const live = matches.filter((match) => match.status === "live");
  const upcoming = matches.filter((match) => match.status === "scheduled");
  const past = matches.filter(
    (match) => match.status === "finished" || match.status === "cancelled"
  );

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

      <CategoryNav basePath="/partidos" value={categoria} allowAll />

      {loadError ? (
        <QueryError message={`No se pudieron cargar los partidos: ${loadError}`} />
      ) : null}

      <Tabs defaultValue={live.length ? "live" : upcoming.length ? "upcoming" : "all"}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">Todos</TabsTrigger>
          <TabsTrigger value="live">En vivo</TabsTrigger>
          <TabsTrigger value="upcoming">Próximos</TabsTrigger>
          <TabsTrigger value="past">Pasados</TabsTrigger>
        </TabsList>
        <TabsContent value="all">
          <MatchList matches={matches} />
        </TabsContent>
        <TabsContent value="live">
          <MatchList matches={live} empty="No hay partidos en curso." />
        </TabsContent>
        <TabsContent value="upcoming">
          <MatchList matches={upcoming} empty="No hay partidos programados." />
        </TabsContent>
        <TabsContent value="past">
          <MatchList matches={past} empty="Aún no hay partidos finalizados." />
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
