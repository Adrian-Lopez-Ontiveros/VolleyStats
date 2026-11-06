import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { PageHeader } from "@/components/page-header";
import { Scoreboard } from "@/components/matches/scoreboard";
import { MatchStatsPanel } from "@/components/stats/match-stats-panel";
import { PointHistory } from "@/components/matches/point-history";
import { ExportMatchExcelButton } from "@/components/export-match-excel-button";
import { Button } from "@/components/ui/button";
import { requirePrivateMember, loadPrivateWorkspace, privateMatchWithTeams } from "@/lib/private-teams-data";
import { MATCH_EVENT_SELECT, MATCH_LINEUP_SELECT } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import { setterStartZone } from "@/lib/court";
import { overlayFinishedMatchScore } from "@/lib/volleyball";
import type { Match, MatchEventWithPlayer, MatchLineupEntry } from "@/lib/types";

export const metadata: Metadata = { title: "Partido privado" };
export const dynamic = "force-dynamic";
export default async function PrivateMatchPage({ params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params;
  await requirePrivateMember();
  const supabase = await createClient();
  const { data } = await supabase.from("matches").select("*").eq("id", matchId).eq("is_private", true).maybeSingle();
  if (!data) notFound();
  const match = data as Match;
  const workspace = await loadPrivateWorkspace(match.home_team_id);
  if (!workspace.matches.some((item) => item.id === matchId)) notFound();
  const [{ data: events }, { data: lineupRows }] = await Promise.all([
    supabase.from("match_events").select(MATCH_EVENT_SELECT as "*").eq("match_id", matchId).order("created_at", { ascending: false }),
    supabase.from("match_lineups").select(MATCH_LINEUP_SELECT as "*").eq("match_id", matchId),
  ]);
  const typedEvents = (events ?? []) as MatchEventWithPlayer[];
  const typedMatch = overlayFinishedMatchScore(privateMatchWithTeams(match, workspace.teams), typedEvents);
  const lineup = (lineupRows ?? []) as MatchLineupEntry[];
  const setterStarts = {
    homeSetterStart: setterStartZone(lineup, workspace.players, match.home_team_id),
    awaySetterStart: setterStartZone(lineup, workspace.players, match.away_team_id),
  };
  return <div className="space-y-4">
    <Link href={`/mis-equipos/${match.home_team_id}`} className="text-sm font-medium text-accent hover:underline">← Volver a Mis equipos</Link>
    <PageHeader title={`${typedMatch.home_team.name} vs ${typedMatch.away_team.name}`} description={`Partido privado · ${format(new Date(match.scheduled_at), "d MMMM yyyy, HH:mm", { locale: es })}`} action={<ExportMatchExcelButton match={typedMatch} events={typedEvents} roster={workspace.players} setterStarts={setterStarts} />} />
    <Scoreboard match={typedMatch} />
    {match.status !== "finished" && match.status !== "cancelled" ? <Button asChild variant="accent" className="w-full"><Link href={`/mis-equipos/partidos/${match.id}/seguimiento`}>{match.status === "live" ? "Continuar seguimiento en vivo" : "Empezar seguimiento en vivo"}</Link></Button> : null}
    {typedEvents.length > 0 ? <section><h2 className="mb-3 text-lg font-semibold">Resumen estadístico</h2><MatchStatsPanel match={typedMatch} events={typedEvents} setterStarts={setterStarts} /><div className="mt-4"><PointHistory events={typedEvents} substitutions={[]} homeTeamId={match.home_team_id} homeTeam={typedMatch.home_team} awayTeam={typedMatch.away_team} /></div></section> : <p className="text-sm text-muted-foreground">Abre el seguimiento para elegir la alineación, el saque y la rotación inicial y empezar a apuntar.</p>}
  </div>;
}
