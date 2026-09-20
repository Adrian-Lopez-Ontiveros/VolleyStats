import type { Metadata } from "next";
import Link from "next/link";
import { KeyRound } from "lucide-react";
import { PlayerCardSection } from "@/components/players/player-card-section";
import { AvatarUpload } from "@/components/profile/avatar-upload";
import { NotificationToggle } from "@/components/profile/notification-toggle";
import { PlayerEvolutionPanel } from "@/components/stats/player-evolution-panel";
import { AttendanceCard } from "@/components/stats/stat-summary";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ProgressCard } from "@/components/game/progress-card";
import { requireUser } from "@/lib/auth";
import {
  PLAYER_CARD_SELECT,
  POSITION_LABELS,
  ROLE_LABELS,
  USER_PROGRESS_SELECT,
  hasCoachAccess,
} from "@/lib/constants";
import { rewardLabel } from "@/lib/game";
import { createClient } from "@/lib/supabase/server";
import type { PlayerCard, PointType, UserProgress } from "@/lib/types";

export const metadata: Metadata = { title: "Mi perfil" };

export default async function ProfilePage() {
  const user = await requireUser();
  const supabase = await createClient();
  const player = user.profile.player;
  let teamMatches = 0;
  let skillEvents: {
    match_id: string;
    point_type: PointType;
    created_at: string;
    set_number?: number | null;
    serving_team_id?: string | null;
    match?: { scheduled_at?: string | null; status?: string | null } | null;
  }[] = [];

  if (player?.id) {
    const [{ data: events }, teamResult] = await Promise.all([
      supabase
        .from("match_events")
        .select(
          "match_id, point_type, created_at, set_number, serving_team_id, match:matches(scheduled_at, status)"
        )
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

    skillEvents = (events ?? []) as typeof skillEvents;
    teamMatches = teamResult.count ?? 0;
  }

  const [{ data: notifyPrefs }, cardResult, progressResult, predsResult] = await Promise.all([
    supabase.from("profiles").select("notify_match_end").eq("id", user.id).maybeSingle(),
    player?.id
      ? supabase
          .from("player_cards")
          .select(PLAYER_CARD_SELECT as "*")
          .eq("player_id", player.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("user_progress")
      .select(USER_PROGRESS_SELECT as "*")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("match_predictions")
      .select("is_correct")
      .eq("user_id", user.id)
      .not("is_correct", "is", null),
  ]);
  const notifyEnabled = Boolean(
    notifyPrefs && "notify_match_end" in notifyPrefs && notifyPrefs.notify_match_end
  );
  const playerCard = (cardResult.data as PlayerCard | null) ?? null;
  const progress = (progressResult.data as UserProgress | null) ?? null;
  const title = rewardLabel(progress?.equipped_title);
  const resolvedPreds = (predsResult.data ?? []) as { is_correct: boolean | null }[];
  const predPlayed = resolvedPreds.length;
  const predHits = resolvedPreds.filter((row) => row.is_correct).length;
  const predRate = predPlayed > 0 ? Math.round((predHits / predPlayed) * 100) : null;

  return (
    <div className="space-y-6">
      <AvatarUpload
        userId={user.id}
        name={user.profile.full_name}
        url={user.profile.avatar_url ?? player?.avatar_url}
        frameId={progress?.equipped_frame}
      />

      <div className="text-center">
        <h1 className="text-2xl font-bold">{user.profile.full_name}</h1>
        {title ? <p className="text-sm font-medium text-orange-700">{title}</p> : null}
        <p className="text-sm text-muted-foreground">{user.email}</p>
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          <Badge
            variant={
              user.profile.role === "admin"
                ? "accent"
                : user.profile.role === "coach"
                  ? "default"
                  : "secondary"
            }
          >
            {ROLE_LABELS[user.profile.role]}
          </Badge>
          {user.profile.team ? (
            <Badge variant="outline">Juega · {user.profile.team.name}</Badge>
          ) : null}
          {user.profile.coached_team &&
          user.profile.coached_team.id !== user.profile.team?.id ? (
            <Badge variant="outline">Entrena · {user.profile.coached_team.name}</Badge>
          ) : null}
          {player?.position ? (
            <Badge variant="outline">{POSITION_LABELS[player.position]}</Badge>
          ) : null}
        </div>
      </div>

      {player ? (
        <PlayerCardSection
          player={player}
          card={playerCard}
          team={user.profile.team}
          canEdit
          editHref="/perfil/carta"
          title="Mi cromo"
        />
      ) : null}

      {progress ? (
        <div className="space-y-2">
          <ProgressCard progress={progress} />
          <Card>
            <CardContent className="flex items-center justify-between gap-3 p-4">
              <div>
                <p className="text-sm font-semibold">Aciertos en predicciones</p>
                <p className="text-xs text-muted-foreground">
                  {predPlayed > 0
                    ? `${predHits} de ${predPlayed} ${predPlayed === 1 ? "pronóstico" : "pronósticos"}`
                    : "Todavía no hay pronósticos resueltos"}
                </p>
              </div>
              <p className="text-2xl font-black tabular-nums text-orange-700">
                {predRate == null ? "—" : `${predRate}%`}
              </p>
            </CardContent>
          </Card>
          <Button asChild variant="outline" className="w-full">
            <Link href="/predicciones">Ver predicciones y recompensas</Link>
          </Button>
        </div>
      ) : null}

      <Card>
        <CardContent className="space-y-2 p-4 text-sm">
          <Row label="Juega en" value={user.profile.team?.name ?? "Sin equipo"} />
          {hasCoachAccess(user.profile.role) ? (
            <Row
              label="Entrena"
              value={user.profile.coached_team?.name ?? "Sin equipo asignado"}
            />
          ) : null}
          <Row
            label="Dorsal"
            value={player?.jersey_number != null ? `#${player.jersey_number}` : "—"}
          />
          <Row
            label="Posición"
            value={player?.position ? POSITION_LABELS[player.position] : "—"}
          />
          <p className="pt-2 text-xs text-muted-foreground">
            Puedes cambiar tu foto, tu cromo y tu dorsal desde Equipos. El equipo que juegas y el que entrenas los asigna un administrador.
          </p>
        </CardContent>
      </Card>

      <NotificationToggle enabled={notifyEnabled} />

      {player ? (
        <>
          <div>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Evolución de rendimiento</h2>
              {hasCoachAccess(user.profile.role) && player.team_id ? (
                <Button asChild size="sm" variant="outline">
                  <Link href={`/comparar?ids=${player.id}`}>Comparar</Link>
                </Button>
              ) : null}
            </div>
            <PlayerEvolutionPanel events={skillEvents} teamId={player.team_id} />
          </div>

          <AttendanceCard
            played={new Set(skillEvents.map((event) => event.match_id)).size}
            teamMatches={teamMatches}
          />
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
