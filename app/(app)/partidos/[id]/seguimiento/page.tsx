import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LiveTracker } from "@/components/matches/live-tracker";
import { PageHeader } from "@/components/page-header";
import { requireAdmin } from "@/lib/auth";
import {
  MATCH_EVENT_SELECT,
  MATCH_WITH_TEAMS_SELECT,
  PLAYER_ROSTER_SELECT,
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

  const { data: match } = await supabase
    .from("matches")
    .select(MATCH_WITH_TEAMS_SELECT as "*")
    .eq("id", id)
    .maybeSingle();

  if (!match) notFound();

  const typedMatch = match as MatchWithTeams;

  const [{ data: homePlayers }, { data: awayPlayers }, { data: events }, { data: lineup }, { data: subRows }] =
    await Promise.all([
      supabase
        .from("players")
        .select(PLAYER_ROSTER_SELECT as "*")
        .eq("team_id", typedMatch.home_team_id)
        .order("jersey_number", { ascending: true, nullsFirst: false }),
      supabase
        .from("players")
        .select(PLAYER_ROSTER_SELECT as "*")
        .eq("team_id", typedMatch.away_team_id)
        .order("jersey_number", { ascending: true, nullsFirst: false }),
      supabase
        .from("match_events")
        .select(MATCH_EVENT_SELECT as "*")
        .eq("match_id", id)
        .order("created_at", { ascending: false }),
      supabase.from("match_lineups").select("*").eq("match_id", id),
      supabase
        .from("match_substitutions")
        .select("*")
        .eq("match_id", id)
        .order("created_at", { ascending: true }),
    ]);

  const roster = [...((homePlayers ?? []) as Player[]), ...((awayPlayers ?? []) as Player[])];
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
        homePlayers={(homePlayers ?? []) as Player[]}
        awayPlayers={(awayPlayers ?? []) as Player[]}
        events={(events ?? []) as MatchEventWithPlayer[]}
        lineup={(lineup ?? []) as MatchLineupEntry[]}
        substitutions={typedSubs}
      />
    </>
  );
}
