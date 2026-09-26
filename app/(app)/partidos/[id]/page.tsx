import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MapPin } from "lucide-react";
import { MatchKindBadge } from "@/components/matches/match-kind";
import { formatMatchWhen, stripFmvScheduleNote } from "@/lib/federation/schedule";
import { MatchAdminActions } from "@/components/matches/match-admin-actions";
import { BoxScoreCard } from "@/components/matches/box-score";
import { BoxScoreReveal } from "@/components/matches/box-score-reveal";
import { ShareBoxScore } from "@/components/matches/share-box-score";
import { LiveScoreFollow } from "@/components/matches/live-score-follow";
import { MatchLineup } from "@/components/matches/match-lineup";
import { MatchStatsPanel } from "@/components/stats/match-stats-panel";
import { PointHistory } from "@/components/matches/point-history";
import { Scoreboard } from "@/components/matches/scoreboard";
import { SubstitutionPanel } from "@/components/matches/substitution-panel";
import { BackButton } from "@/components/back-button";
import { PageHeader } from "@/components/page-header";
import { ActivityLog } from "@/components/matches/activity-log";
import { ExportMatchExcelButton } from "@/components/export-match-excel-button";
import { Card, CardContent } from "@/components/ui/card";
import { QueryError } from "@/components/query-error";
import { getMatchActivity } from "@/lib/actions/activity";
import { requireViewer } from "@/lib/auth";
import { canTrackLiveMatch } from "@/lib/federation/leagues";
import { buildBoxScore } from "@/lib/box-score";
import { setterStartZone } from "@/lib/court";
import { currentOnCourtIds, playersOnBench, playersOnCourt } from "@/lib/lineup";
import {
  MATCH_EVENT_SELECT,
  MATCH_LINEUP_SELECT,
  MATCH_SUB_SELECT,
  MATCH_WITH_TEAMS_SELECT,
  PLAYER_LINEUP_SELECT,
} from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import { isScoringAction, overlayFinishedMatchScore } from "@/lib/volleyball";
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
  const { canManage } = await requireViewer();
  const supabase = await createClient();

  const [{ data: match, error: matchError }, { data: events }] = await Promise.all([
    supabase.from("matches").select(MATCH_WITH_TEAMS_SELECT as "*").eq("id", id).maybeSingle(),
    supabase
      .from("match_events")
      .select(MATCH_EVENT_SELECT as "*")
      .eq("match_id", id)
      .order("created_at", { ascending: false }),
  ]);

  if (matchError) {
    return <QueryError message={`No se pudo cargar el partido: ${matchError.message}`} />;
  }
  if (!match) notFound();

  const typedEvents = (events ?? []) as MatchEventWithPlayer[];
  const typedMatch = overlayFinishedMatchScore(match as MatchWithTeams, typedEvents);
  const publicEvents = typedEvents.filter((event) => isScoringAction(event.point_type));
  const notes = stripFmvScheduleNote(typedMatch.notes);

  if (!canManage) {
    return (
      <>
        <div className="mb-3">
          <BackButton href="/partidos" />
        </div>
        <PageHeader
          title={`${typedMatch.home_team.name} vs ${typedMatch.away_team.name}`}
          description={formatMatchWhen({
            scheduledAt: typedMatch.scheduled_at,
            notes: typedMatch.notes,
            isFederation: typedMatch.is_federation,
          })}
        />
        <div className="space-y-4">
          <LiveScoreFollow match={typedMatch} events={publicEvents} />
          <p className="flex justify-center">
            <MatchKindBadge match={typedMatch} round={typedMatch.federation_round} />
          </p>
          {typedMatch.location ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              {typedMatch.location}
            </p>
          ) : null}
          {notes ? (
            <Card>
              <CardContent className="p-4 text-sm">{notes}</CardContent>
            </Card>
          ) : null}
        </div>
      </>
    );
  }

  const clubTeamId = typedMatch.home_team.is_club_team
    ? typedMatch.home_team_id
    : typedMatch.away_team.is_club_team
      ? typedMatch.away_team_id
      : null;

  const [{ data: lineupRows }, { data: subRows }, { data: clubPlayers }, { data: positionRows }] =
    await Promise.all([
    supabase.from("match_lineups").select(MATCH_LINEUP_SELECT as "*").eq("match_id", id),
    supabase
      .from("match_substitutions")
      .select(MATCH_SUB_SELECT as "*")
      .eq("match_id", id)
      .order("created_at", { ascending: true }),
    clubTeamId
      ? supabase
          .from("players")
          .select(PLAYER_LINEUP_SELECT as "*")
          .eq("team_id", clubTeamId)
          .order("jersey_number", { ascending: true, nullsFirst: false })
      : Promise.resolve({ data: [] as Player[] }),
    supabase
      .from("players")
      .select("id, position")
      .in("team_id", [typedMatch.home_team_id, typedMatch.away_team_id]),
  ]);

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
  const onCourtIds = clubTeamId
    ? currentOnCourtIds(typedLineup, typedSubs, clubTeamId, typedMatch.current_set)
    : null;
  const activity = await getMatchActivity(id);
  const setterRoster = (positionRows ?? []) as Pick<Player, "id" | "position">[];
  const setterStarts = {
    homeSetterStart: setterStartZone(typedLineup, setterRoster, typedMatch.home_team_id),
    awaySetterStart: setterStartZone(typedLineup, setterRoster, typedMatch.away_team_id),
  };
  const excelRoster = ((clubPlayers ?? []) as Player[]).map((player) => ({
    id: player.id,
    full_name: player.full_name,
    jersey_number: player.jersey_number,
    position: player.position,
    team_id: player.team_id,
  }));

  return (
    <>
      <div className="mb-3">
        <BackButton href="/partidos" />
      </div>
      <PageHeader
        title={`${typedMatch.home_team.name} vs ${typedMatch.away_team.name}`}
        description={formatMatchWhen({
          scheduledAt: typedMatch.scheduled_at,
          notes: typedMatch.notes,
          isFederation: typedMatch.is_federation,
        })}
        action={
          <ExportMatchExcelButton
            match={typedMatch}
            events={typedEvents}
            roster={excelRoster}
            setterStarts={setterStarts}
          />
        }
      />
      <div className="space-y-4">
        <Scoreboard match={typedMatch} />
        <p className="flex justify-center">
          <MatchKindBadge match={typedMatch} round={typedMatch.federation_round} />
        </p>

        {typedMatch.location ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            {typedMatch.location}
          </p>
        ) : null}

        {notes ? (
          <Card>
            <CardContent className="p-4 text-sm">{notes}</CardContent>
          </Card>
        ) : null}

        {typedEvents.length > 0 ? (
          <BoxScoreReveal>
            <ShareBoxScore
              captureId="match-box-score"
              fileName={`fuenlastats-${typedMatch.home_team.short_name || "local"}-${typedMatch.away_team.short_name || "visitante"}`}
            />
            <BoxScoreCard data={buildBoxScore(typedMatch, typedEvents, setterStarts)} captureId="match-box-score" />
          </BoxScoreReveal>
        ) : null}

        <MatchAdminActions
          matchId={typedMatch.id}
          status={typedMatch.status}
          canTrackLive={canTrackLiveMatch(typedMatch)}
        />

        {canTrackLiveMatch(typedMatch) && clubTeamId ? (
          <MatchLineup teamName={clubTeamName} entries={typedLineup} />
        ) : null}

        {canTrackLiveMatch(typedMatch) && clubTeamId ? (
          <SubstitutionPanel
            matchId={typedMatch.id}
            players={roster}
            onCourtPlayers={playersOnCourt(roster, onCourtIds)}
            benchPlayers={playersOnBench(roster, onCourtIds)}
            substitutions={typedSubs}
            canEdit={typedMatch.status !== "cancelled"}
          />
        ) : null}

        <section>
          <h2 className="mb-3 text-lg font-semibold">Resumen estadístico</h2>
          <MatchStatsPanel match={typedMatch} events={typedEvents} setterStarts={setterStarts} />
        </section>

        <PointHistory
          events={typedEvents}
          substitutions={typedSubs}
          homeTeamId={typedMatch.home_team_id}
          homeTeam={typedMatch.home_team}
          awayTeam={typedMatch.away_team}
        />

        <section>
          <h2 className="mb-3 text-lg font-semibold">Historial de cambios</h2>
          <ActivityLog entries={activity} />
        </section>
      </div>
    </>
  );
}
