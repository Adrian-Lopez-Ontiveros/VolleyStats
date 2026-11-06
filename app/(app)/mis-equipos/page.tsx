import type { Metadata } from "next";
import { FolderHeart, LockKeyhole, Plus, UsersRound, Volleyball } from "lucide-react";
import { requirePrivateMember, loadPrivateTeamsOverview } from "@/lib/private-teams-data";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import { CreateTeamForm } from "@/components/private-teams/private-forms";
import { PrivateTeamCard, matchSummary } from "@/components/private-teams/private-team-card";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = { title: "Mis equipos" };
export const dynamic = "force-dynamic";

export default async function PrivateTeamsPage() {
  await requirePrivateMember();
  const { teams, playerCounts, matches, matchTeams } = await loadPrivateTeamsOverview();

  return (
    <div className="space-y-8">
      <header className="mx-auto max-w-2xl text-center">
        <Badge variant="secondary" className="mb-3 bg-accent/10 px-3 py-1 text-accent">
          <LockKeyhole className="h-3.5 w-3.5" aria-hidden />
          Tu espacio privado
        </Badge>
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border bg-card text-primary shadow-sm dark:text-accent">
          <FolderHeart className="h-6 w-6" aria-hidden />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Mis equipos</h1>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
          Tus plantillas y partidos privados, siempre a mano.
        </p>
      </header>

      <Card id="nuevo-equipo" className="mx-auto max-w-2xl p-5 sm:p-6">
        <div className="mb-5 flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
            <Plus className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h2 className="font-semibold">Crea un nuevo equipo</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">Dale un nombre y empieza a jugar.</p>
          </div>
        </div>
        <CreateTeamForm />
      </Card>

      <section aria-labelledby="private-teams-heading">
        <div className="mb-4 flex items-center justify-between gap-3 border-t pt-6">
          <div>
            <h2 id="private-teams-heading" className="text-lg font-semibold">Tus equipos</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">Entra para gestionar su plantilla y sus partidos.</p>
          </div>
          {teams.length > 0 ? (
            <Badge variant="secondary" className="shrink-0">{teams.length} {teams.length === 1 ? "equipo" : "equipos"}</Badge>
          ) : null}
        </div>
        {teams.length === 0 ? (
          <EmptyState
            icon={UsersRound}
            title="Aquí aparecerán tus equipos"
            description="Crea el primero arriba y reúne a tu plantilla. Solo tú y las personas que invites podréis verlo."
            className="border-accent/25 bg-card/80 py-10"
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {teams.map((team) => (
              <PrivateTeamCard
                key={team.id}
                team={team}
                info={{ playerCount: playerCounts[team.id] ?? 0, ...matchSummary(matches, team.id, [...teams, ...matchTeams]) }}
              />
            ))}
          </div>
        )}
      </section>
      <p className="flex items-center justify-center gap-1.5 pb-2 text-center text-xs text-muted-foreground">
        <Volleyball className="h-3.5 w-3.5 text-accent" aria-hidden />
        Organiza. Sigue cada punto. Disfruta del voleibol.
      </p>
    </div>
  );
}
