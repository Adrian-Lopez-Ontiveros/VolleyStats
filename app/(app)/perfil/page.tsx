import type { Metadata } from "next";
import Link from "next/link";
import { KeyRound } from "lucide-react";
import { AvatarUpload } from "@/components/profile/avatar-upload";
import { PlayerEvolutionChart } from "@/components/stats/charts";
import { AttendanceCard, StatSummary } from "@/components/stats/stat-summary";
import { StatGrid } from "@/components/stats/stat-grid";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { POSITION_LABELS } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import {
  buildPlayerMatchSeries,
  formatEfficiency,
  summarizePlayerSeries,
} from "@/lib/stats";
import type { PointType } from "@/lib/types";

export const metadata: Metadata = { title: "Mi perfil" };

export default async function ProfilePage() {
  const user = await requireUser();
  const supabase = await createClient();
  const player = user.profile.player;
  let series: ReturnType<typeof buildPlayerMatchSeries> = [];
  let teamMatches = 0;

  if (player?.id) {
    const [{ data: events }, teamResult] = await Promise.all([
      supabase
        .from("match_events")
        .select("match_id, point_type, created_at, match:matches(id, scheduled_at, status)")
        .eq("player_id", player.id)
        .order("created_at", { ascending: true }),
      player.team_id
        ? supabase
            .from("matches")
            .select("id", { count: "exact", head: true })
            .eq("status", "finished")
            .or(`home_team_id.eq.${player.team_id},away_team_id.eq.${player.team_id}`)
        : Promise.resolve({ count: 0 }),
    ]);

    series = buildPlayerMatchSeries(
      ((events ?? []) as {
        match_id: string;
        point_type: PointType;
        created_at: string;
        match?: { scheduled_at?: string | null; status?: string | null } | null;
      }[])
    );
    teamMatches = teamResult.count ?? 0;
  }

  const totals = summarizePlayerSeries(series);

  return (
    <div className="space-y-6">
      <AvatarUpload
        userId={user.id}
        name={user.profile.full_name}
        url={user.profile.avatar_url ?? player?.avatar_url}
      />

      <div className="text-center">
        <h1 className="text-2xl font-bold">{user.profile.full_name}</h1>
        <p className="text-sm text-muted-foreground">{user.email}</p>
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          <Badge variant={user.profile.role === "admin" ? "accent" : "secondary"}>
            {user.profile.role === "admin" ? "Administrador" : "Jugador"}
          </Badge>
          {user.profile.team ? <Badge variant="outline">{user.profile.team.name}</Badge> : null}
          {player?.position ? (
            <Badge variant="outline">{POSITION_LABELS[player.position]}</Badge>
          ) : null}
        </div>
      </div>

      <Card>
        <CardContent className="space-y-2 p-4 text-sm">
          <Row label="Equipo" value={user.profile.team?.name ?? "Sin equipo"} />
          <Row
            label="Dorsal"
            value={player?.jersey_number != null ? `#${player.jersey_number}` : "—"}
          />
          <Row
            label="Posición"
            value={player?.position ? POSITION_LABELS[player.position] : "—"}
          />
          <p className="pt-2 text-xs text-muted-foreground">
            Puedes cambiar tu foto. El resto de datos lo edita un administrador.
          </p>
        </CardContent>
      </Card>

      {player ? (
        <>
          <div>
            <h2 className="mb-3 text-lg font-semibold">Evolución de rendimiento</h2>
            <Card>
              <CardContent className="p-4">
                <PlayerEvolutionChart data={series} />
              </CardContent>
            </Card>
            <div className="mt-3">
              <StatSummary
                items={[
                  { label: "Puntos", value: totals.points, accent: true },
                  { label: "Errores", value: totals.errors },
                  {
                    label: "Eficiencia",
                    value: formatEfficiency(totals.efficiency),
                    hint: "(pts − err) / (pts + err)",
                  },
                ]}
              />
            </div>
          </div>

          <AttendanceCard played={series.length} teamMatches={teamMatches} />

          <div>
            <h2 className="mb-3 text-lg font-semibold">Mis estadísticas</h2>
            <StatGrid stats={player} />
          </div>

          <div>
            <h2 className="mb-3 text-lg font-semibold">Actividad reciente</h2>
            {series.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Todavía no tienes puntos registrados.
              </p>
            ) : (
              <ul className="space-y-2">
                {[...series].reverse().slice(0, 6).map((item) => (
                  <li key={item.matchId}>
                    <Link
                      href={`/partidos/${item.matchId}`}
                      className="flex items-center justify-between rounded-xl border bg-card px-3 py-2 text-sm"
                    >
                      <span>{item.label}</span>
                      <span className="tabular-nums text-muted-foreground">
                        {item.points} pts · {item.errors} err · {formatEfficiency(item.efficiency)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          Tu perfil de jugador aún no está vinculado. Un admin puede asociarlo.
        </p>
      )}

      <Button asChild variant="outline" className="w-full">
        <Link href="/perfil/password">
          <KeyRound className="h-4 w-4" />
          Cambiar contraseña
        </Link>
      </Button>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
