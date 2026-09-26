import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { DeletePlayerButton } from "@/components/players/delete-player-button";
import { PlayerCardSection } from "@/components/players/player-card-section";
import { PageHeader } from "@/components/page-header";
import { PlayerEvolutionPanel } from "@/components/stats/player-evolution-panel";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ExportCsvButton } from "@/components/export-csv-button";
import { Button } from "@/components/ui/button";
import { canViewPlayerStats, requireViewer } from "@/lib/auth";
import {
  PLAYER_CARD_SELECT,
  PLAYER_LINEUP_SELECT,
  PLAYER_ROSTER_SELECT,
  POINT_TYPE_META,
  POSITION_LABELS,
  TEAM_SUMMARY_SELECT,
} from "@/lib/constants";
import { canManagePlayerCard } from "@/lib/player-card";
import { createClient } from "@/lib/supabase/server";
import { formatJersey, initials } from "@/lib/utils";
import type { PlayerCard, PlayerWithTeam, PointType } from "@/lib/types";

export const metadata: Metadata = { title: "Jugador" };

export default async function PlayerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const viewer = await requireViewer();
  const { user, canManage } = viewer;
  const canViewStats = canViewPlayerStats(viewer, id);
  const supabase = await createClient();
  const playerSelect = canViewStats
    ? `${PLAYER_ROSTER_SELECT}, team:teams(${TEAM_SUMMARY_SELECT})`
    : `${PLAYER_LINEUP_SELECT}, team:teams(${TEAM_SUMMARY_SELECT})`;

  const [{ data: player }, eventsResult, { data: card }] = await Promise.all([
    supabase.from("players").select(`${playerSelect}` as "*").eq("id", id).maybeSingle(),
    canViewStats
      ? supabase
          .from("match_events")
          .select(
            "id, match_id, point_type, created_at, set_number, serving_team_id, match:matches(id, scheduled_at, status, home_team_id, away_team_id, home_team:teams!matches_home_team_id_fkey(name, short_name), away_team:teams!matches_away_team_id_fkey(name, short_name))" as "*"
          )
          .eq("player_id", id)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    supabase.from("player_cards").select(PLAYER_CARD_SELECT as "*").eq("player_id", id).maybeSingle(),
  ]);
  const events = eventsResult.data;

  if (!player) notFound();
  const typed = player as PlayerWithTeam;

  const typedEvents = (events ?? []) as {
    match_id: string;
    point_type: PointType;
    created_at: string;
    set_number?: number | null;
    serving_team_id?: string | null;
    match?: {
      scheduled_at?: string | null;
      status?: string | null;
      home_team_id?: string | null;
      away_team_id?: string | null;
      home_team?: { name?: string | null; short_name?: string | null } | null;
      away_team?: { name?: string | null; short_name?: string | null } | null;
    } | null;
  }[];

  return (
    <>
      <div className="mb-6 flex items-start gap-4">
        <Avatar className="h-20 w-20">
          <AvatarImage src={typed.avatar_url ?? undefined} alt={typed.full_name} />
          <AvatarFallback className="text-xl">{initials(typed.full_name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <PageHeader
            className="mb-2"
            title={`${formatJersey(typed.jersey_number)} ${typed.full_name}`}
            description={typed.team?.name ?? "Sin equipo"}
            action={
              <div className="flex flex-wrap justify-end gap-2">
                {canViewStats ? (
                  <ExportCsvButton
                    filename={`jugador-${typed.full_name.replace(/\s+/g, "-").toLowerCase()}`}
                    rows={[
                      ["Jugador", typed.full_name],
                      ["Equipo", typed.team?.name ?? ""],
                      [],
                      ["Hora", "Partido", "Acción"],
                      ...typedEvents.map((event) => [
                        event.created_at,
                        event.match_id,
                        POINT_TYPE_META[event.point_type]?.label ?? event.point_type,
                      ]),
                    ]}
                  />
                ) : null}
                {canManage ? (
                  <>
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/comparar?ids=${id}`}>Comparar</Link>
                    </Button>
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/jugadores/${id}/editar`}>
                        <Pencil className="h-4 w-4" />
                        Editar
                      </Link>
                    </Button>
                  </>
                ) : null}
              </div>
            }
          />
          <div className="flex flex-wrap gap-2">
            {typed.position ? (
              <Badge variant="secondary">{POSITION_LABELS[typed.position]}</Badge>
            ) : null}
            {canManage ? (
              typed.user_id ? (
                <Badge>Cuenta vinculada</Badge>
              ) : (
                <Badge variant="outline">Sin cuenta</Badge>
              )
            ) : null}
          </div>
        </div>
      </div>

      <div className="mb-8">
        <PlayerCardSection
          player={typed}
          card={(card as PlayerCard | null) ?? null}
          team={typed.team}
          canEdit={canManagePlayerCard(user, id)}
          editHref={
            user?.profile.player?.id === id ? "/perfil/carta" : `/jugadores/${id}/carta`
          }
        />
      </div>

      {canViewStats ? (
        <>
          <h2 className="mb-3 text-lg font-semibold">Evolución de rendimiento</h2>
          <PlayerEvolutionPanel events={typedEvents} teamId={typed.team_id} />
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          Las estadísticas de cada jugador solo las ven el cuerpo técnico y el propio jugador.
        </p>
      )}

      {canManage ? (
        <div className="mt-8">
          <DeletePlayerButton playerId={id} />
        </div>
      ) : null}
    </>
  );
}
