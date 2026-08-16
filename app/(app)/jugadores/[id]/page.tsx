import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { DeletePlayerButton } from "@/components/players/delete-player-button";
import { PageHeader } from "@/components/page-header";
import dynamic from "next/dynamic";
import { StatSummary } from "@/components/stats/stat-summary";
import { StatGrid } from "@/components/stats/stat-grid";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireViewer } from "@/lib/auth";
import { PLAYER_ROSTER_SELECT, POINT_TYPE_META, POSITION_LABELS, TEAM_SUMMARY_SELECT } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import {
  buildPlayerMatchSeries,
  formatEfficiency,
  summarizePlayerSeries,
} from "@/lib/stats";
import { formatJersey, initials } from "@/lib/utils";
import type { MatchEvent, PlayerWithTeam, PointType } from "@/lib/types";

const PlayerEvolutionChart = dynamic(
  () => import("@/components/stats/charts").then((mod) => mod.PlayerEvolutionChart),
  { loading: () => <div className="h-64 w-full" /> }
);

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
      .select("id, match_id, point_type, created_at, match:matches(id, scheduled_at)" as "*")
      .eq("player_id", id)
      .order("created_at", { ascending: false }),
  ]);

  if (!player) notFound();
  const typed = player as PlayerWithTeam;

  const typedEvents = (events ?? []) as (MatchEvent & {
    match: { id: string; scheduled_at: string } | null;
    point_type: PointType;
  })[];

  const series = buildPlayerMatchSeries(typedEvents);
  const totals = summarizePlayerSeries(series);

  const byMatch = new Map<
    string,
    { matchId: string; date: string; counts: Record<string, number> }
  >();

  for (const event of typedEvents) {
    const key = event.match_id;
    if (!byMatch.has(key)) {
      byMatch.set(key, {
        matchId: key,
        date: event.match?.scheduled_at ?? event.created_at,
        counts: {},
      });
    }
    const bucket = byMatch.get(key)!;
    bucket.counts[event.point_type] = (bucket.counts[event.point_type] ?? 0) + 1;
  }

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
              isAdmin ? (
                <Button asChild size="sm" variant="outline">
                  <Link href={`/jugadores/${id}/editar`}>
                    <Pencil className="h-4 w-4" />
                    Editar
                  </Link>
                </Button>
              ) : null
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
      <Card>
        <CardContent className="p-4">
          <PlayerEvolutionChart data={series} />
        </CardContent>
      </Card>
      <div className="mb-8 mt-3">
        <StatSummary
          items={[
            { label: "Puntos", value: totals.points, accent: true },
            { label: "Errores", value: totals.errors },
            { label: "Eficiencia", value: formatEfficiency(totals.efficiency) },
          ]}
        />
      </div>

      <h2 className="mb-3 text-lg font-semibold">Estadísticas totales</h2>
      <StatGrid stats={typed} />

      <h2 className="mb-3 mt-8 text-lg font-semibold">Por partido</h2>
      {byMatch.size === 0 ? (
        <p className="text-sm text-muted-foreground">Todavía no tiene puntos registrados.</p>
      ) : (
        <div className="space-y-3">
          {[...byMatch.values()].map((item) => (
            <Link key={item.matchId} href={`/partidos/${item.matchId}`}>
              <Card>
                <CardContent className="space-y-2 p-4">
                  <p className="text-sm font-semibold">
                    {new Date(item.date).toLocaleDateString("es")}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(item.counts).map(([type, count]) => (
                      <span
                        key={type}
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          POINT_TYPE_META[type as keyof typeof POINT_TYPE_META].className
                        }`}
                      >
                        {POINT_TYPE_META[type as keyof typeof POINT_TYPE_META].short} {count}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {isAdmin ? (
        <div className="mt-8">
          <DeletePlayerButton playerId={id} />
        </div>
      ) : null}
    </>
  );
}
