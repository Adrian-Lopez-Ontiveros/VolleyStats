import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { MapPin } from "lucide-react";
import { MatchAdminActions } from "@/components/matches/match-admin-actions";
import { MatchLineup } from "@/components/matches/match-lineup";
import { MatchStatsPanel } from "@/components/stats/match-stats-panel";
import { PointHistory } from "@/components/matches/point-history";
import { Scoreboard } from "@/components/matches/scoreboard";
import { SubstitutionPanel } from "@/components/matches/substitution-panel";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { QueryError } from "@/components/query-error";
import { requireViewer } from "@/lib/auth";
import { currentOnCourtIds, playersOnBench, playersOnCourt } from "@/lib/lineup";
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

export const metadata: Metadata = { title: "Detalle del partido" };

export default async function MatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { isAdmin } = await requireViewer();
  const supabase = await createClient();

  const [
    { data: match, error: matchError },
    { data: events },
    { data: lineupRows },
    { data: subRows },
  ] = await Promise.all([
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

  if (matchError) {
    return <QueryError message={`No se pudo cargar el partido: ${matchError.message}`} />;
  }
  if (!match) notFound();

  const typedMatch = match as MatchWithTeams;
  const clubTeamId = typedMatch.home_team.is_club_team
    ? typedMatch.home_team_id
    : typedMatch.away_team.is_club_team
      ? typedMatch.away_team_id
      : null;

  const { data: clubPlayers } = clubTeamId
    ? await supabase
        .from("players")
        .select(PLAYER_LINEUP_SELECT as "*")
        .eq("team_id", clubTeamId)
        .order("jersey_number", { ascending: true, nullsFirst: false })
    : { data: [] as Player[] };

  const typedEvents = (events ?? []) as MatchEventWithPlayer[];
  const playersById = new Map(((clubPlayers ?? []) as Player[]).map((player) => [player.id, player]));
  const typedLineup = ((lineupRows ?? []) as MatchLineupEntry[])
    .map((entry) => ({
      ...entry,
      player: playersById.get(entry.player_id) ?? null,
    }))
    .sort((a, b) => (a.player?.jersey_number ?? 99) - (b.player?.jersey_number ?? 99));
  const typedSubs = ((subRows ?? []) as MatchSubstitution[]).map((item) => ({
    ...item,
    player_out: playersById.get(item.player_out_id) ?? null,
    player_in: playersById.get(item.player_in_id) ?? null,
  }));
  const clubTeamName = typedMatch.home_team.is_club_team
    ? typedMatch.home_team.name
    : typedMatch.away_team.is_club_team
      ? typedMatch.away_team.name
      : "CV Fuenlabrada";
  const roster = (clubPlayers ?? []) as Player[];
  const onCourtIds = clubTeamId ? currentOnCourtIds(typedLineup, typedSubs, clubTeamId) : null;

  return (
    <>
      <PageHeader
        title={`${typedMatch.home_team.name} vs ${typedMatch.away_team.name}`}
        description={format(new Date(typedMatch.scheduled_at), "EEEE d MMMM yyyy · HH:mm", {
          locale: es,
        })}
      />
      <div className="space-y-4">
        <Scoreboard match={typedMatch} />

        {typedMatch.location ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            {typedMatch.location}
          </p>
        ) : null}

        {typedMatch.notes ? (
          <Card>
            <CardContent className="p-4 text-sm">{typedMatch.notes}</CardContent>
          </Card>
        ) : null}

        {isAdmin ? (
          <MatchAdminActions matchId={typedMatch.id} status={typedMatch.status} />
        ) : null}

        {clubTeamId ? (
          <MatchLineup teamName={clubTeamName} entries={typedLineup} />
        ) : null}

        {clubTeamId ? (
          <SubstitutionPanel
            matchId={typedMatch.id}
            players={roster}
            onCourtPlayers={playersOnCourt(roster, onCourtIds)}
            benchPlayers={playersOnBench(roster, onCourtIds)}
            substitutions={typedSubs}
            canEdit={isAdmin && typedMatch.status !== "cancelled"}
          />
        ) : null}

        <section>
          <h2 className="mb-3 text-lg font-semibold">Resumen estadístico</h2>
          <MatchStatsPanel match={typedMatch} events={typedEvents} />
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold">Historial del partido</h2>
          <PointHistory
            events={typedEvents}
            substitutions={typedSubs}
            homeTeamId={typedMatch.home_team_id}
          />
        </section>
      </div>
    </>
  );
}
