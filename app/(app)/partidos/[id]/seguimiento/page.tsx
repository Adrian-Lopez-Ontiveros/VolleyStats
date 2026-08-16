import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { LiveTracker } from "@/components/matches/live-tracker";
import { PageHeader } from "@/components/page-header";
import { requireAdmin } from "@/lib/auth";
import { canTrackLiveMatch } from "@/lib/federation/leagues";
import {
  MATCH_EVENT_SELECT,
  MATCH_LINEUP_SELECT,
  MATCH_SUB_SELECT,
  MATCH_WITH_TEAMS_SELECT,
  PLAYER_LINEUP_SELECT,
} from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
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
  await requireAdmin();
  const supabase = await createClient();

  const [{ data: match }, { data: events }, { data: lineup }, { data: subRows }] =
    await Promise.all([
      supabase.from("matches").select(MATCH_WITH_TEAMS_SELECT as "*").eq("id", id).maybeSingle(),
      supabase
        .from("match_events")
        .select(MATCH_EVENT_SELECT as "*")
        .eq("match_id", id)
        .order("created_at", { ascending: false }),
      supabase.from("match_lineups").select(MATCH_LINEUP_SELECT as "*").eq("match_id", id),
      supabase
        .from("match_substitutions")
        .select(MATCH_SUB_SELECT as "*")
        .eq("match_id", id)
        .order("created_at", { ascending: true }),
    ]);

  if (!match) notFound();

  const typedMatch = match as MatchWithTeams;
  if (!canTrackLiveMatch(typedMatch)) {
    redirect(`/partidos/${id}`);
  }

  const { data: rosterRows } = await supabase
    .from("players")
    .select(PLAYER_LINEUP_SELECT as "*")
    .in("team_id", [typedMatch.home_team_id, typedMatch.away_team_id])
    .order("jersey_number", { ascending: true, nullsFirst: false });

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
        description="Solo los jugadores en pista pueden anotar. Usa Cambio para las sustituciones."
      />
      <LiveTracker
        match={typedMatch}
        homePlayers={homePlayers}
        awayPlayers={awayPlayers}
        events={(events ?? []) as MatchEventWithPlayer[]}
        lineup={(lineup ?? []) as MatchLineupEntry[]}
        substitutions={typedSubs}
      />
    </>
  );
}
