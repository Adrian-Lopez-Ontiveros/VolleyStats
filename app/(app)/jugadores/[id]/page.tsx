import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { DeletePlayerButton } from "@/components/players/delete-player-button";
import { PageHeader } from "@/components/page-header";
import { PlayerEvolutionPanel } from "@/components/stats/player-evolution-panel";
import { StatGrid } from "@/components/stats/stat-grid";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ExportCsvButton } from "@/components/export-csv-button";
import { Button } from "@/components/ui/button";
import { requireViewer } from "@/lib/auth";
import { PLAYER_ROSTER_SELECT, POINT_TYPE_META, POSITION_LABELS, TEAM_SUMMARY_SELECT } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import { formatJersey, initials } from "@/lib/utils";
import type { PlayerWithTeam, PointType } from "@/lib/types";

export const metadata: Metadata = { title: "Jugador" };

export default async function PlayerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { isAdmin } = await requireViewer();
  const supabase = await createClient();

  const [{ data: player }, { data: events }] = await Promise.all([
    supabase
      .from("players")
      .select(`${PLAYER_ROSTER_SELECT}, team:teams(${TEAM_SUMMARY_SELECT})` as "*")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("match_events")
      .select(
        "id, match_id, point_type, created_at, set_number, serving_team_id, match:matches(id, scheduled_at)" as "*"
      )
      .eq("player_id", id)
      .order("created_at", { ascending: false }),
  ]);

  if (!player) notFound();
  const typed = player as PlayerWithTeam;

  const typedEvents = (events ?? []) as {
    match_id: string;
    point_type: PointType;
    created_at: string;
    set_number?: number | null;
    serving_team_id?: string | null;
    match?: { scheduled_at?: string | null } | null;
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
                <Button asChild size="sm" variant="outline">
                  <Link href={`/comparar?ids=${id}`}>Comparar</Link>
                </Button>
                {isAdmin ? (
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/jugadores/${id}/editar`}>
                      <Pencil className="h-4 w-4" />
                      Editar
                    </Link>
                  </Button>
                ) : null}
              </div>
            }
          />
          <div className="flex flex-wrap gap-2">
            {typed.position ? (
              <Badge variant="secondary">{POSITION_LABELS[typed.position]}</Badge>
            ) : null}
            {isAdmin ? (
              typed.user_id ? (
                <Badge>Cuenta vinculada</Badge>
              ) : (
                <Badge variant="outline">Sin cuenta</Badge>
              )
            ) : null}
          </div>
        </div>
      </div>

      <h2 className="mb-3 text-lg font-semibold">Evolución de rendimiento</h2>
      <PlayerEvolutionPanel events={typedEvents} teamId={typed.team_id} />

      <h2 className="mb-3 mt-8 text-lg font-semibold">Estadísticas totales</h2>
      <StatGrid stats={typed} />

      {isAdmin ? (
        <div className="mt-8">
          <DeletePlayerButton playerId={id} />
        </div>
      ) : null}
    </>
  );
}
