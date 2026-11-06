import type { Metadata } from "next";
import Link from "next/link";
import { LockKeyhole, UsersRound } from "lucide-react";
import { requirePrivateMember, loadPrivateTeams } from "@/lib/private-teams-data";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { CreateTeamForm } from "@/components/private-teams/private-forms";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "Mis equipos" };
export const dynamic = "force-dynamic";
export default async function PrivateTeamsPage() {
  await requirePrivateMember();
  const teams = await loadPrivateTeams();
  return <div className="space-y-6">
    <PageHeader title="Mis equipos" description="Crea tus equipos privados, sus plantillas y sus partidos con seguimiento en vivo." />
    <Card><CardContent><h2 className="mb-3 font-semibold">Nuevo equipo privado</h2></CardContent><CardContent><CreateTeamForm /></CardContent></Card>
    {teams.length === 0 ? <EmptyState icon={UsersRound} title="Todavía no tienes equipos privados" description="Crea tu primer equipo y añade jugadores a su plantilla." /> : <section className="grid gap-3 md:grid-cols-2">{teams.map((team) => <Link key={team.id} href={`/mis-equipos/${team.id}`}><Card className="h-full transition-colors hover:border-accent"><CardContent><h2 className="mb-3 flex items-center gap-2 font-semibold"><LockKeyhole className="h-5 w-5 text-accent" />{team.name}</h2></CardContent><CardContent className="text-sm text-muted-foreground">Abrir plantilla y partidos privados</CardContent></Card></Link>)}</section>}
  </div>;
}
