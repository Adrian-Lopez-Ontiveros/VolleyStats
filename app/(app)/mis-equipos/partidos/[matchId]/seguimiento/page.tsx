import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LiveTracker } from "@/components/matches/live-tracker";
import { PageHeader } from "@/components/page-header";
import { requirePrivateMember, loadPrivateWorkspace, privateMatchWithTeams } from "@/lib/private-teams-data";
import { MATCH_EVENT_SELECT, MATCH_LINEUP_SELECT, MATCH_SUB_SELECT } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import { overlayFinishedMatchScore } from "@/lib/volleyball";
import type { Match, MatchEventWithPlayer, MatchLineupEntry, MatchSubstitution } from "@/lib/types";

export const metadata: Metadata = { title: "Seguimiento del partido privado" };
export const dynamic = "force-dynamic";
export default async function PrivateLiveMatchPage({ params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params;
  await requirePrivateMember();
  const supabase = await createClient();
  const { data } = await supabase.from("matches").select("*").eq("id", matchId).eq("is_private", true).maybeSingle();
  if (!data) notFound();
  const match = data as Match;
  const workspace = await loadPrivateWorkspace(match.home_team_id);
  if (!workspace.matches.some((item) => item.id === matchId)) notFound();
  const [{ data: events }, { data: lineup }, { data: subRows }] = await Promise.all([
    supabase.from("match_events").select(MATCH_EVENT_SELECT as "*").eq("match_id", matchId).order("created_at", { ascending: false }),
    supabase.from("match_lineups").select(MATCH_LINEUP_SELECT as "*").eq("match_id", matchId),
    supabase.from("match_substitutions").select(MATCH_SUB_SELECT as "*").eq("match_id", matchId).order("created_at", { ascending: true }),
  ]);
  const typedEvents = (events ?? []) as MatchEventWithPlayer[];
  const typedMatch = overlayFinishedMatchScore(privateMatchWithTeams(match, workspace.teams), typedEvents);
  const playersById = new Map(workspace.players.map((player) => [player.id, player]));
  const substitutions = ((subRows ?? []) as MatchSubstitution[]).map((item) => ({ ...item, player_out: playersById.get(item.player_out_id) ?? null, player_in: playersById.get(item.player_in_id) ?? null }));
  return <>
    <PageHeader title="Seguimiento en vivo" description="Partido privado. Las alineaciones, el saque y las rotaciones funcionan igual que en el resto de partidos." />
    <LiveTracker match={typedMatch} homePlayers={workspace.players.filter((player) => player.team_id === match.home_team_id)} awayPlayers={workspace.players.filter((player) => player.team_id === match.away_team_id)} events={typedEvents} lineup={(lineup ?? []) as MatchLineupEntry[]} substitutions={substitutions} />
  </>;
}
