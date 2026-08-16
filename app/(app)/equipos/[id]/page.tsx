import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Plus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DeleteTeamButton } from "@/components/teams/delete-team-button";
import dynamic from "next/dynamic";
import { TeamLogo } from "@/components/teams/team-logo";
import { PlayerRankingTable } from "@/components/stats/player-ranking-table";
import { StatSummary, WinRateCard } from "@/components/stats/stat-summary";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ExportCsvButton } from "@/components/export-csv-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { QueryError } from "@/components/query-error";
import { requireViewer } from "@/lib/auth";
import { getCategoryMeta } from "@/lib/categories";
import { MATCH_TEAM_SERIES_SELECT, PLAYER_ROSTER_SELECT, POSITION_LABELS, TEAM_SELECT } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import {
  buildPlayerMatchSeries,
  buildTeamMatchSeries,
  formatSigned,
  rankPlayers,
  summarizeTeamSeries,
} from "@/lib/stats";
import { RotationSummaryCards, RotationTable } from "@/components/stats/rotation-table";
import { AttackServeCards, PossessionCards } from "@/components/stats/skill-stats";
import {
  attackStatsFromEvents,
  filterTeamEvents,
  possessionStatsForTeam,
  receptionStatsFromEvents,
  rotationStatsAcrossMatches,
  serveStatsFromEvents,
} from "@/lib/volleyball-stats";
import { formatJersey, initials } from "@/lib/utils";
import { totalPlayerPoints } from "@/lib/volleyball";
import type { MatchWithTeams, Player, PointType, Team } from "@/lib/types";

const TeamPointsBarChart = dynamic(
  () => import("@/components/stats/charts").then((mod) => mod.TeamPointsBarChart),
  { loading: () => <div className="h-64 w-full" /> }
);

export const metadata: Metadata = { title: "Equipo" };

export default async function TeamDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { isAdmin } = await requireViewer();
  const supabase = await createClient();

  const [{ data: team, error: teamError }, { data: players, error: playersError }, { data: matches }] =
    await Promise.all([
      supabase.from("teams").select(TEAM_SELECT as "*").eq("id", id).maybeSingle(),
      supabase
        .from("players")
        .select(PLAYER_ROSTER_SELECT as "*")
        .eq("team_id", id)
        .order("jersey_number", { ascending: true, nullsFirst: false }),
      supabase
        .from("matches")
        .select(MATCH_TEAM_SERIES_SELECT as "*")
        .or(`home_team_id.eq.${id},away_team_id.eq.${id}`)
        .eq("status", "finished")
        .order("scheduled_at", { ascending: true }),
    ]);

  if (teamError) {
    return <QueryError message={`No se pudo cargar el equipo: ${teamError.message}`} />;
  }
  if (!team) notFound();
  const typedTeam = team as Team;

  const typedPlayers = (players ?? []) as Player[];
  const typedMatches = (matches ?? []) as MatchWithTeams[];
  const playerIds = typedPlayers.map((player) => player.id);

  const matchIds = typedMatches.map((item) => item.id);
  const [{ data: events }, { data: teamMatchEvents }] = await Promise.all([
    playerIds.length > 0
      ? supabase
          .from("match_events")
          .select("player_id, match_id, point_type, created_at, match:matches(scheduled_at, status)")
          .in("player_id", playerIds)
      : Promise.resolve({ data: [] }),
    matchIds.length > 0
      ? supabase
          .from("match_events")
          .select("match_id, point_type, acting_team_id, scoring_team_id, serving_team_id, home_rotation, away_rotation, set_number, created_at")
          .in("match_id", matchIds)
      : Promise.resolve({ data: [] }),
  ]);

  const seriesByPlayer = new Map<string, ReturnType<typeof buildPlayerMatchSeries>>();
  const eventsByPlayer = new Map<
    string,
    {
      match_id: string;
      point_type: PointType;
      created_at: string;
      match?: { scheduled_at?: string | null; status?: string | null } | null;
    }[]
  >();

  for (const event of (events ?? []) as {
    player_id: string | null;
    match_id: string;
    point_type: PointType;
    created_at: string;
    match?: { scheduled_at?: string | null; status?: string | null } | null;
  }[]) {
    if (!event.player_id) continue;
    const list = eventsByPlayer.get(event.player_id) ?? [];
    list.push(event);
    eventsByPlayer.set(event.player_id, list);
  }

  for (const player of typedPlayers) {
    seriesByPlayer.set(player.id, buildPlayerMatchSeries(eventsByPlayer.get(player.id) ?? []));
  }

  const ranked = rankPlayers(typedPlayers, seriesByPlayer, eventsByPlayer);
  const teamSeries = buildTeamMatchSeries(id, typedMatches);
  const teamTotals = summarizeTeamSeries(teamSeries);
  const typedTeamEvents = (teamMatchEvents ?? []) as {
    match_id: string;
    point_type: PointType;
    acting_team_id?: string | null;
    scoring_team_id?: string | null;
    serving_team_id?: string | null;
    home_rotation?: number | null;
    away_rotation?: number | null;
    set_number?: number;
    created_at?: string;
  }[];
  const teamActingEvents = filterTeamEvents(typedTeamEvents, id);
  const teamAttack = attackStatsFromEvents(teamActingEvents);
  const teamServe = serveStatsFromEvents(teamActingEvents);
  const teamReception = receptionStatsFromEvents(teamActingEvents);
  const teamPossession = possessionStatsForTeam(typedMatches, typedTeamEvents, id);
  const teamRotations = rotationStatsAcrossMatches(typedMatches, typedTeamEvents, id);

  return (
    <>
      <PageHeader
        title={typedTeam.name}
        description={
          [
            typedTeam.is_club_team ? "CV Fuenlabrada" : null,
            typedTeam.category ? getCategoryMeta(typedTeam.category).label : null,
            typedTeam.city,
            typedTeam.short_name,
          ]
            .filter(Boolean)
            .join(" · ") || "Plantilla del equipo"
        }
        leading={
          <TeamLogo
            name={typedTeam.name}
            shortName={typedTeam.short_name}
            logoUrl={typedTeam.logo_url}
            size="lg"
          />
        }
        action={
          <div className="flex flex-wrap justify-end gap-2">
            <ExportCsvButton
              filename={`equipo-${typedTeam.short_name || typedTeam.name}`}
              rows={[
                ["Equipo", typedTeam.name],
                ["PJ", teamTotals.played],
                ["Ganados", teamTotals.won],
                ["Perdidos", teamTotals.lost],
                [],
                ["Jugador", "Dorsal", "Puntos", "Ataques", "Bloqueos", "Aces", "Errores"],
                ...typedPlayers.map((player) => [
                  player.full_name,
                  player.jersey_number,
                  totalPlayerPoints(player),
                  player.attack_points,
                  player.block_points,
                  player.aces,
                  player.errors,
                ]),
                [],
                ["Rotación", "PF", "PC", "Errores"],
                ...teamRotations.map((row) => [
                  row.rotation,
                  row.pointsFor,
                  row.pointsAgainst,
                  row.errors,
                ]),
              ]}
            />
            {isAdmin ? (
              <>
                <Button asChild size="sm" variant="outline">
                  <Link href={`/comparar?team=${id}`}>Comparar</Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link href={`/equipos/${id}/editar`}>
                    <Pencil className="h-4 w-4" />
                    Editar
                  </Link>
                </Button>
              </>
            ) : null}
          </div>
        }
      />

      {playersError ? (
        <QueryError message={`No se pudo cargar la plantilla: ${playersError.message}`} />
      ) : null}

      <div className="space-y-6">
        <WinRateCard
          won={teamTotals.won}
          played={teamTotals.played}
          winRate={teamTotals.winRate}
        />

        <StatSummary
          items={[
            { label: "PJ", value: teamTotals.played },
            { label: "Ganados", value: teamTotals.won, accent: true },
            { label: "Perdidos", value: teamTotals.lost },
            { label: "Dif. puntos", value: formatSigned(teamTotals.pointDiff) },
          ]}
        />

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Métricas de juego</h2>
          <AttackServeCards attack={teamAttack} serve={teamServe} reception={teamReception} />
          <PossessionCards
            sideOut={teamPossession.sideOut}
            breakPoint={teamPossession.breakPoint}
          />
          <h3 className="text-base font-semibold">Por rotación</h3>
          <RotationSummaryCards rows={teamRotations} />
          <RotationTable rows={teamRotations} title="Temporada" />
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold">Puntos a favor vs en contra</h2>
          <Card>
            <CardContent className="p-4">
              <TeamPointsBarChart data={teamSeries} />
            </CardContent>
          </Card>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold">Ranking de jugadores</h2>
          {ranked.length === 0 ? (
            <p className="text-sm text-muted-foreground">Este equipo todavía no tiene jugadores.</p>
          ) : (
            <PlayerRankingTable players={ranked} />
          )}
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Plantilla</h2>
            {isAdmin ? (
              <Button asChild size="sm" variant="outline">
                <Link href={`/jugadores/nuevo?team=${id}`}>
                  <Plus className="h-4 w-4" />
                  Añadir
                </Link>
              </Button>
            ) : null}
          </div>
          {typedPlayers.length === 0 ? (
            <p className="text-sm text-muted-foreground">Este equipo todavía no tiene jugadores.</p>
          ) : (
            typedPlayers.map((player) => (
              <Link key={player.id} href={`/jugadores/${player.id}`}>
                <Card className="mb-3">
                  <CardContent className="flex items-center gap-3 p-4">
                    <Avatar>
                      <AvatarImage src={player.avatar_url ?? undefined} alt={player.full_name} />
                      <AvatarFallback>{initials(player.full_name)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">
                        {formatJersey(player.jersey_number)} {player.full_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {player.position ? POSITION_LABELS[player.position] : "Sin posición"}
                      </p>
                    </div>
                    <p className="text-sm font-bold tabular-nums">
                      {totalPlayerPoints(player)} pts
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))
          )}
        </section>
      </div>

      {isAdmin ? (
        <div className="mt-8">
          <DeleteTeamButton teamId={id} />
        </div>
      ) : null}
    </>
  );
}
