import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { LiveScoreFollow } from "@/components/matches/live-score-follow";
import { LiveTracker } from "@/components/matches/live-tracker";
import { PageHeader } from "@/components/page-header";
import { requireViewer } from "@/lib/auth";
import { canTrackLiveMatch } from "@/lib/federation/leagues";
import {
  MATCH_EVENT_SELECT,
  MATCH_LINEUP_SELECT,
  MATCH_SUB_SELECT,
  MATCH_WITH_TEAMS_SELECT,
  PLAYER_LINEUP_SELECT,
} from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import { unwrapOne } from "@/lib/utils";
import { isScoringAction } from "@/lib/volleyball";
import type {
  MatchEventWithPlayer,
  MatchLineupEntry,
  MatchSubstitution,
  MatchWithTeams,
  Player,
} from "@/lib/types";

export const metadata: Metadata = { title: "Seguimiento en vivo" };

export default async function LiveMatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { canManage } = await requireViewer();
  const supabase = await createClient();

  const { data: match } = await supabase
    .from("matches")
    .select(MATCH_WITH_TEAMS_SELECT as "*")
    .eq("id", id)
    .maybeSingle();

  if (!match) notFound();

  const typedMatch = match as MatchWithTeams;
  const homeTeam = unwrapOne(typedMatch.home_team);
  const awayTeam = unwrapOne(typedMatch.away_team);
  if (!homeTeam || !awayTeam) notFound();
  typedMatch.home_team = homeTeam;
  typedMatch.away_team = awayTeam;
  typedMatch.set_scores = typedMatch.set_scores ?? [];
  if (!canTrackLiveMatch(typedMatch)) {
    redirect(`/partidos/${id}`);
  }

  const { data: events } = await supabase
    .from("match_events")
    .select(MATCH_EVENT_SELECT as "*")
    .eq("match_id", id)
    .order("created_at", { ascending: false });

  const typedEvents = (events ?? []) as MatchEventWithPlayer[];

  if (!canManage) {
    return (
      <>
        <PageHeader
          title="Seguimiento en vivo"
          description="Resultado y punto a punto del partido."
        />
        <LiveScoreFollow
          match={typedMatch}
          events={typedEvents.filter((event) => isScoringAction(event.point_type))}
        />
      </>
    );
  }

  const [{ data: lineup }, { data: subRows }, { data: rosterRows }] = await Promise.all([
    supabase.from("match_lineups").select(MATCH_LINEUP_SELECT as "*").eq("match_id", id),
    supabase
      .from("match_substitutions")
      .select(MATCH_SUB_SELECT as "*")
      .eq("match_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("players")
      .select(PLAYER_LINEUP_SELECT as "*")
      .in("team_id", [typedMatch.home_team_id, typedMatch.away_team_id])
      .order("jersey_number", { ascending: true, nullsFirst: false }),
  ]);

  const roster = (rosterRows ?? []) as Player[];
  const homePlayers = roster.filter((player) => player.team_id === typedMatch.home_team_id);
  const awayPlayers = roster.filter((player) => player.team_id === typedMatch.away_team_id);
  const playersById = new Map(roster.map((player) => [player.id, player]));
  const typedSubs = ((subRows ?? []) as MatchSubstitution[]).map((item) => ({
    ...item,
    player_out: playersById.get(item.player_out_id) ?? null,
    player_in: playersById.get(item.player_in_id) ?? null,
  }));

  return (
    <>
      <PageHeader
        title="Seguimiento en vivo"
        description="Anota desde el pad de las jugadoras en pista. Al cambiar de set puedes elegir titulares de nuevo."
      />
      <LiveTracker
        match={typedMatch}
        homePlayers={homePlayers}
        awayPlayers={awayPlayers}
        events={typedEvents}
        lineup={(lineup ?? []) as MatchLineupEntry[]}
        substitutions={typedSubs}
      />
    </>
  );
}
