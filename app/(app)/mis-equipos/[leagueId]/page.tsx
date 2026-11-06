import type { Metadata } from "next";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarDays, LockKeyhole, Users } from "lucide-react";
import { requirePrivateMember, loadPrivateWorkspace } from "@/lib/private-teams-data";
import { privateLeagueStandings, privatePlayerStats } from "@/lib/private-teams";
import { hasCoachAccess } from "@/lib/constants";
import { Card, CardContent } from "@/components/ui/card";
import { CreateMatchForm, CreateTeamForm, InviteForm } from "@/components/private-teams/private-forms";
import { PrivatePlayerForm } from "@/components/private-teams/private-player-form";
import type { Team } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Liga privada" };
export const dynamic = "force-dynamic";
const POSITIONS: Record<string, string> = { receptor: "Receptor", colocador: "Colocador", central: "Central", opuesto: "Opuesto", libero: "Líbero", universal: "Universal" };
function Score({ home, away, status }: { home: number; away: number; status: string }) { return status === "finished" ? <span className="font-bold tabular-nums">{home}–{away}</span> : <span className="text-muted-foreground">Pendiente</span>; }
export default async function PrivateLeaguePage({ params }: { params: Promise<{ leagueId: string }> }) {
  const { leagueId } = await params;
  const user = await requirePrivateMember();
  const workspace = await loadPrivateWorkspace(leagueId);
  const { league, teams, players, matches, events, isOwner } = workspace;
  const standings = privateLeagueStandings(teams, matches);
  const supabase = await createClient();
  const { data: memberRows } = await supabase.from("team_members").select("team_id, role").eq("user_id", user.id).eq("accepted", true).in("team_id", teams.map((team) => team.id));
  const membership = new Map((memberRows ?? []).map((row) => [row.team_id, row.role as string]));
  const canEditTeam = (team: Team) => isOwner || membership.get(team.id) === "editor" || (hasCoachAccess(user.profile.role) && team.owner_id === user.id);
  const editableTeams = teams.filter(canEditTeam);
  const canCreateMatch = teams.length >= 2 && editableTeams.length === teams.length && editableTeams.length >= 2;
  return <div className="space-y-6">
    <Link href="/mis-equipos" className="text-sm font-medium text-accent hover:underline">← Mis equipos</Link>
    <div><h1 className="flex items-center gap-2 text-2xl font-black"><LockKeyhole className="h-7 w-7 text-accent" />{league.name}</h1><p className="mt-1 text-sm text-muted-foreground">{teams.length} equipos · {matches.length} partidos · Clasificación privada</p></div>
    {isOwner ? <Card><CardContent><h2 className="mb-3 font-semibold">Añadir equipo o rival</h2></CardContent><CardContent><CreateTeamForm league={league} /></CardContent></Card> : null}
    <section className="space-y-3"><h2 className="flex items-center gap-2 text-lg font-semibold"><Users className="h-5 w-5" />Equipos y plantillas</h2><div className="grid gap-4 lg:grid-cols-2">{teams.map((team) => { const roster = players.filter((player) => player.team_id === team.id); const editable = canEditTeam(team); return <Card key={team.id} id={team.id}><CardContent><h2 className="mb-3 font-semibold">{team.name}<span className="ml-2 text-xs font-normal text-muted-foreground">{editable ? "Puedes editar" : "Solo lectura"}</span></h2></CardContent><CardContent className="space-y-4">{roster.length === 0 ? <p className="text-sm text-muted-foreground">Todavía no hay jugadores en la plantilla.</p> : roster.map((player) => editable ? <div key={player.id} className="border-b pb-4 last:border-0"><PrivatePlayerForm teamId={team.id} player={player} /></div> : <div key={player.id} className="flex items-center justify-between text-sm"><span>{player.full_name}{player.position ? <span className="ml-2 text-xs text-muted-foreground">{POSITIONS[player.position] ?? player.position}</span> : null}</span><span className="text-muted-foreground">#{player.jersey_number ?? "—"}</span></div>)}
      {editable ? <PrivatePlayerForm teamId={team.id} /> : null}
      {isOwner && team.owner_id === user.id ? <div className="border-t pt-4"><h3 className="mb-3 text-sm font-semibold">Compartir este equipo</h3><InviteForm teamId={team.id} leagueId={leagueId} /></div> : null}
    </CardContent></Card>; })}</div></section>
    {canCreateMatch ? <Card><CardContent><h2 className="mb-3 flex items-center gap-2 font-semibold"><CalendarDays className="h-5 w-5" />Nuevo partido manual</h2></CardContent><CardContent><CreateMatchForm leagueId={leagueId} teams={teams} /><p className="mt-2 text-xs text-muted-foreground">La base de datos exige permiso de edición en el local y el visitante.</p></CardContent></Card> : null}
    <section className="space-y-3"><h2 className="text-lg font-semibold">Estadísticas privadas por jugador</h2>
      <Card><CardContent className="overflow-x-auto p-0">{players.length === 0 ? <p className="p-4 text-sm text-muted-foreground">Añade jugadores para poder apuntar sus acciones.</p> : <table className="w-full min-w-[740px] text-sm"><thead><tr className="border-b bg-secondary/40 text-left text-xs uppercase text-muted-foreground"><th className="p-3">Jugador</th><th className="p-3">Equipo</th><th className="p-3">Partidos</th><th className="p-3">Puntos</th><th className="p-3">Ataques</th><th className="p-3">Bloqueos</th><th className="p-3">Aces</th><th className="p-3">Errores</th></tr></thead><tbody>{players.map((player) => { const own = events.filter((event) => event.player_id === player.id); const stats = privatePlayerStats(own); const matchIds = new Set(own.map((event) => event.match_id)); return <tr key={player.id} className="border-b"><td className="p-3 font-medium">{player.full_name}</td><td className="p-3">{teams.find((team) => team.id === player.team_id)?.name ?? "Equipo"}</td><td className="p-3">{matchIds.size}</td><td className="p-3 font-bold">{stats.points}</td><td className="p-3">{stats.attackPoints}</td><td className="p-3">{stats.blockPoints}</td><td className="p-3">{stats.aces}</td><td className="p-3">{stats.errors}</td></tr>; })}</tbody></table>}</CardContent></Card><p className="text-xs text-muted-foreground">Solo se suman las acciones registradas en los partidos manuales de esta liga privada.</p></section>
    <section className="space-y-3"><h2 className="text-lg font-semibold">Clasificación privada</h2><Card><CardContent className="overflow-x-auto p-0"><table className="w-full text-sm"><thead><tr className="border-b text-left text-xs uppercase text-muted-foreground"><th className="p-3">#</th><th className="p-3">Equipo</th><th className="p-3">PJ</th><th className="p-3">G</th><th className="p-3">P</th><th className="p-3">Sets</th><th className="bg-accent/10 p-3 font-bold">Puntos</th></tr></thead><tbody>{standings.map((row) => <tr key={row.team.id} className="border-b last:bg-card last:border-0"><td className="p-3">{row.position}</td><td className="p-3 font-medium">{row.team.name}</td><td className="p-3">{row.played}</td><td className="p-3">{row.won}</td><td className="p-3">{row.lost}</td><td className="p-3">{row.setsFor}–{row.setsAgainst}</td><td className="bg-accent/10 p-3 text-base font-bold">{row.leaguePoints}</td></tr>)}</tbody></table></CardContent></Card><p className="text-xs text-muted-foreground">3-0 o 3-1: 3 puntos al ganador. 3-2: 2 puntos al ganador y 1 al perdedor.</p></section>
    <section className="space-y-3"><h2 className="text-lg font-semibold">Partidos</h2>{matches.length === 0 ? <p className="text-sm text-muted-foreground">Aún no hay partidos.</p> : <div className="grid gap-3 md:grid-cols-2">{matches.map((match) => <Link href={`/mis-equipos/partidos/${match.id}`} key={match.id}><Card className="h-full hover:border-accent"><CardContent className="p-4"><p className="mb-2 text-xs text-muted-foreground">{format(new Date(match.scheduled_at), "d MMM yyyy, HH:mm", { locale: es })}</p><div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-sm"><span>{teams.find((team) => team.id === match.home_team_id)?.name ?? "Local"}</span><Score home={match.home_sets} away={match.away_sets} status={match.status} /><span className="text-right">{teams.find((team) => team.id === match.away_team_id)?.name ?? "Visitante"}</span></div></CardContent></Card></Link>)}</div>}</section>
  </div>;
}
