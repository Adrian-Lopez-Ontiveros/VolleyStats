import type { Metadata } from "next";
import Link from "next/link";
import { LockKeyhole, UsersRound } from "lucide-react";
import { requireMember } from "@/lib/auth";
import { loadPrivateLeagues } from "@/lib/private-teams-data";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { CreateLeagueForm, LeagueInvitations } from "@/components/private-teams/private-forms";
import { Card, CardContent } from "@/components/ui/card";
import { hasCoachAccess } from "@/lib/constants";

export const metadata: Metadata = { title: "Mis equipos" };
export const dynamic = "force-dynamic";
export default async function PrivateTeamsPage() {
  const user = await requireMember();
  const staff = hasCoachAccess(user.profile.role);
  const leagues = await loadPrivateLeagues();
  if (!staff && leagues.length === 0) {
    const { redirect } = await import("next/navigation");
    redirect("/hoy");
  }
  return <div className="space-y-6">
    <PageHeader title="Mis equipos" description="Ligas, plantillas y resultados privados. Solo los ve su propietario y las personas invitadas." />
    <Card><CardContent><h2 className="mb-3 font-semibold">Invitaciones a equipos privados</h2></CardContent><CardContent><p className="mb-3 text-sm text-muted-foreground">Si te han invitado, entra con el mismo correo y confirma aquí para ver el equipo.</p><LeagueInvitations /></CardContent></Card>
    {staff ? <Card><CardContent><h2 className="mb-3 font-semibold">Nueva liga privada</h2></CardContent><CardContent><CreateLeagueForm /></CardContent></Card> : null}
    {leagues.length === 0 ? <EmptyState icon={UsersRound} title="Todavía no tienes equipos privados" description={staff ? "Crea una liga privada y después añade tu equipo y sus rivales." : "Cuando aceptes una invitación, la liga compartida aparecerá aquí."} /> : <section className="grid gap-3 md:grid-cols-2">{leagues.map((league) => <Link key={league.id} href={`/mis-equipos/${league.id}`}><Card className="h-full transition-colors hover:border-accent"><CardContent><h2 className="mb-3 flex items-center gap-2 font-semibold"><LockKeyhole className="h-5 w-5 text-accent" />{league.name}</h2></CardContent><CardContent className="text-sm text-muted-foreground">{league.owner_id === user.id ? "Liga de tu propiedad" : "Liga compartida contigo"} · Abrir equipos y clasificación</CardContent></Card></Link>)}</section>}
  </div>;
}
