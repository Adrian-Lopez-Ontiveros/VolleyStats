import type { Metadata } from "next";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarDays, LockKeyhole, Users } from "lucide-react";
import { requirePrivateMember, loadPrivateWorkspace } from "@/lib/private-teams-data";
import { privatePlayerStats } from "@/lib/private-teams";
import { Card, CardContent } from "@/components/ui/card";
import { CreateMatchForm } from "@/components/private-teams/private-forms";
import { PrivatePlayerForm } from "@/components/private-teams/private-player-form";
import { PrivateDeleteButton } from "@/components/private-teams/private-delete-controls";

export const metadata: Metadata = { title: "Equipo privado" };
export const dynamic = "force-dynamic";
function Score({ home, away, status }: { home: number; away: number; status: string }) { return status === "finished" ? <span className="font-bold tabular-nums">{home}–{away}</span> : status === "live" ? <span className="font-bold text-accent">En juego</span> : <span className="text-muted-foreground">Pendiente</span>; }
export default async function PrivateTeamPage({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  await requirePrivateMember();
  const { teams, players, matches, events, league, canEdit } = await loadPrivateWorkspace(teamId);
  const team = teams.find((item) => item.id === teamId)!;
  const roster = players.filter((player) => player.team_id === teamId);
  const archivedIds = new Set(roster.map((player) => player.id));
  const historicalPlayers = players.filter((player) => player.is_private && !archivedIds.has(player.id) && events.some((event) => event.player_id === player.id));
  const statistics = [...roster, ...historicalPlayers];
  return <div className="space-y-6">
    <Link href="/mis-equipos" className="text-sm font-medium text-accent hover:underline">← Mis equipos</Link>
    <div className="flex flex-wrap items-start justify-between gap-3 sm:items-center">
      <div><h1 className="flex items-center gap-2 text-2xl font-black"><LockKeyhole className="h-7 w-7 text-accent" />{team.name}</h1><p className="mt-1 text-sm text-muted-foreground">{roster.length} jugadores · {matches.length} partidos privados</p></div>
      {canEdit ? <PrivateDeleteButton kind="team" id={team.id} /> : null}
    </div>
    <section className="space-y-3"><h2 className="flex items-center gap-2 text-lg font-semibold"><Users className="h-5 w-5" />Plantilla</h2>
      <Card><CardContent className="space-y-4"><PrivatePlayerForm teamId={team.id} />{roster.length === 0 ? <p className="text-sm text-muted-foreground">Todavía no hay jugadores. Añade al menos seis para colocar la alineación.</p> : <div className="space-y-4 border-t pt-4">{roster.map((player) => <div key={player.id} className="border-b pb-4 last:border-0"><PrivatePlayerForm teamId={team.id} player={player} />{canEdit ? <div className="mt-2 flex justify-end"><PrivateDeleteButton kind="player" id={player.id} teamId={team.id} playerName={player.full_name} /></div> : null}</div>)}</div>}</CardContent></Card>
    </section>
    <Card><CardContent><h2 className="mb-3 flex items-center gap-2 font-semibold"><CalendarDays className="h-5 w-5" />Nuevo partido privado</h2></CardContent><CardContent><CreateMatchForm teamId={teamId} leagueId={league.id} /></CardContent></Card>
    <section className="space-y-3"><h2 className="text-lg font-semibold">Partidos</h2>{matches.length === 0 ? <p className="text-sm text-muted-foreground">Aún no hay partidos privados.</p> : <div className="grid gap-3 md:grid-cols-2">{matches.map((match) => <div key={match.id} className="relative"><Link href={`/mis-equipos/partidos/${match.id}`}><Card className="h-full hover:border-accent"><CardContent className="p-4 pr-16"><p className="mb-2 text-xs text-muted-foreground">{format(new Date(match.scheduled_at), "d MMM yyyy, HH:mm", { locale: es })}</p><div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-sm"><span>{teams.find((item) => item.id === match.home_team_id)?.name ?? "Local"}</span><Score home={match.home_sets} away={match.away_sets} status={match.status} /><span className="text-right">{teams.find((item) => item.id === match.away_team_id)?.name ?? "Visitante"}</span></div></CardContent></Card></Link>{canEdit ? <div className="absolute right-2 top-2"><PrivateDeleteButton kind="match" id={match.id} compact /></div> : null}</div>)}</div>}</section>
    {statistics.length > 0 && events.length > 0 ? <section className="space-y-3"><h2 className="text-lg font-semibold">Estadísticas privadas por jugador</h2><Card><CardContent className="overflow-x-auto p-0"><table className="w-full min-w-[650px] text-sm"><thead><tr className="border-b bg-secondary/40 text-left text-xs uppercase text-muted-foreground"><th className="p-3">Jugador</th><th className="p-3">Partidos</th><th className="p-3">Puntos</th><th className="p-3">Ataques</th><th className="p-3">Bloqueos</th><th className="p-3">Aces</th><th className="p-3">Errores</th></tr></thead><tbody>{statistics.map((player) => { const own = events.filter((event) => event.player_id === player.id); const stats = privatePlayerStats(own); return <tr key={player.id} className="border-b"><td className="p-3 font-medium">{player.full_name}{!player.team_id ? <span className="ml-2 text-xs font-normal text-muted-foreground">(anterior)</span> : null}</td><td className="p-3">{new Set(own.map((event) => event.match_id)).size}</td><td className="p-3 font-bold">{stats.points}</td><td className="p-3">{stats.attackPoints}</td><td className="p-3">{stats.blockPoints}</td><td className="p-3">{stats.aces}</td><td className="p-3">{stats.errors}</td></tr>; })}</tbody></table></CardContent></Card><p className="text-xs text-muted-foreground">Solo se suman las acciones de tus partidos privados.</p></section> : null}
  </div>;
}
