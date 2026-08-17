import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { MapPin } from "lucide-react";
import { MatchAdminActions } from "@/components/matches/match-admin-actions";
import { BoxScoreCard } from "@/components/matches/box-score";
import { BoxScoreReveal } from "@/components/matches/box-score-reveal";
import { ShareBoxScore } from "@/components/matches/share-box-score";
import { MatchLineup } from "@/components/matches/match-lineup";
import { MatchStatsPanel } from "@/components/stats/match-stats-panel";
import { PointHistory } from "@/components/matches/point-history";
import { Scoreboard } from "@/components/matches/scoreboard";
import { SubstitutionPanel } from "@/components/matches/substitution-panel";
import { BackButton } from "@/components/back-button";
import { PageHeader } from "@/components/page-header";
import { ActivityLog } from "@/components/matches/activity-log";
import { ExportCsvButton } from "@/components/export-csv-button";
import { Card, CardContent } from "@/components/ui/card";
import { QueryError } from "@/components/query-error";
import { getMatchActivity } from "@/lib/actions/activity";
import { requireViewer } from "@/lib/auth";
import { canTrackLiveMatch } from "@/lib/federation/leagues";
import { buildBoxScore } from "@/lib/box-score";
import { POINT_TYPE_META } from "@/lib/constants";
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
  const activity = isAdmin ? await getMatchActivity(id) : [];
  const exportRows = [
    ["Partido", `${typedMatch.home_team.name} vs ${typedMatch.away_team.name}`],
    ["Fecha", typedMatch.scheduled_at],
    ["Resultado", `${typedMatch.home_sets}-${typedMatch.away_sets}`],
    [],
    ["Hora", "Set", "Jugador", "Equipo", "Acción", "Punto para"],
    ...typedEvents.map((event) => [
      event.created_at,
      event.set_number,
      event.player?.full_name ?? "",
      event.acting_team_id === typedMatch.home_team_id
        ? typedMatch.home_team.name
        : typedMatch.away_team.name,
      POINT_TYPE_META[event.point_type]?.label ?? event.point_type,
      event.scoring_team_id === typedMatch.home_team_id
        ? typedMatch.home_team.name
        : event.scoring_team_id
          ? typedMatch.away_team.name
          : "",
    ]),
  ];

  return (
    <>
      <div className="mb-3">
        <BackButton href="/partidos" />
      </div>
      <PageHeader
        title={`${typedMatch.home_team.name} vs ${typedMatch.away_team.name}`}
        description={format(new Date(typedMatch.scheduled_at), "EEEE d MMMM yyyy · HH:mm", {
          locale: es,
        })}
        action={
          <ExportCsvButton
            filename={`partido-${typedMatch.home_team.short_name || "local"}-${typedMatch.away_team.short_name || "visitante"}`}
            rows={exportRows}
          />
        }
      />
      <div className="space-y-4">
        <Scoreboard match={typedMatch} />
        <p className="text-center text-xs text-muted-foreground">
          {typedMatch.is_federation
            ? typedMatch.federation_round
              ? `Partido oficial FMV · ${typedMatch.federation_round}`
              : "Partido oficial de la Federación de Madrid"
            : "Partido de seguimiento propio"}
        </p>

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

        {typedEvents.length > 0 ? (
          <BoxScoreReveal>
            <ShareBoxScore
              captureId="match-box-score"
              fileName={`fuenlastats-${typedMatch.home_team.short_name || "local"}-${typedMatch.away_team.short_name || "visitante"}`}
            />
            <BoxScoreCard data={buildBoxScore(typedMatch, typedEvents)} captureId="match-box-score" />
          </BoxScoreReveal>
        ) : null}

        {isAdmin ? (
          <MatchAdminActions
            matchId={typedMatch.id}
            status={typedMatch.status}
            canTrackLive={canTrackLiveMatch(typedMatch)}
          />
        ) : null}

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

        {isAdmin ? (
          <section>
            <h2 className="mb-3 text-lg font-semibold">Historial de cambios</h2>
            <ActivityLog entries={activity} />
          </section>
        ) : null}
      </div>
    </>
  );
}
