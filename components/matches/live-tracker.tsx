"use client";

import { memo, useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Undo2 } from "lucide-react";
import { toast } from "sonner";
import { addSubstitution, recordPoint, undoLastPoint } from "@/lib/actions/matches";
import { POINT_TYPE_META } from "@/lib/constants";
import { currentOnCourtIds, playersOnBench, playersOnCourt } from "@/lib/lineup";
import { cn, formatJersey, initials } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { PointHistory } from "@/components/matches/point-history";
import { Scoreboard } from "@/components/matches/scoreboard";
import { TeamLogo } from "@/components/teams/team-logo";
import type {
  MatchEventWithPlayer,
  MatchLineupEntry,
  MatchSubstitution,
  MatchWithTeams,
  Player,
  PointType,
} from "@/lib/types";

type PendingTarget = {
  teamId: string;
  teamName: string;
  player?: Player;
};

export function LiveTracker({
  match,
  homePlayers,
  awayPlayers,
  events,
  lineup = [],
  substitutions = [],
}: {
  match: MatchWithTeams;
  homePlayers: Player[];
  awayPlayers: Player[];
  events: MatchEventWithPlayer[];
  lineup?: MatchLineupEntry[];
  substitutions?: MatchSubstitution[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [target, setTarget] = useState<PendingTarget | null>(null);
  const [swapTeamId, setSwapTeamId] = useState<string | null>(null);
  const [playerOutId, setPlayerOutId] = useState("");
  const [playerInId, setPlayerInId] = useState("");
  const finished = match.status === "finished";
  const homeOnCourtIds = currentOnCourtIds(lineup, substitutions, match.home_team_id);
  const awayOnCourtIds = currentOnCourtIds(lineup, substitutions, match.away_team_id);
  const homeOnCourt = homeOnCourtIds
    ? playersOnCourt(homePlayers, homeOnCourtIds)
    : match.home_team.is_club_team
      ? []
      : homePlayers;
  const awayOnCourt = awayOnCourtIds
    ? playersOnCourt(awayPlayers, awayOnCourtIds)
    : match.away_team.is_club_team
      ? []
      : awayPlayers;
  const homeBench = playersOnBench(homePlayers, homeOnCourtIds);
  const awayBench = playersOnBench(awayPlayers, awayOnCourtIds);

  useEffect(() => {
    const supabase = createClient();
    let timer: ReturnType<typeof setTimeout> | null = null;
    const refresh = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), 120);
    };

    const channel = supabase
      .channel(`match-${match.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "matches", filter: `id=eq.${match.id}` },
        refresh
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "match_substitutions", filter: `match_id=eq.${match.id}` },
        refresh
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "match_lineups", filter: `match_id=eq.${match.id}` },
        refresh
      )
      .subscribe();

    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [match.id, router]);

  const openTeam = useCallback(
    (teamId: string, teamName: string, player?: Player) => {
      if (finished) return;
      setTarget({ teamId, teamName, player });
    },
    [finished]
  );

  function submitPoint(pointType: PointType) {
    if (!target) return;
    startTransition(async () => {
      const result = await recordPoint({
        matchId: match.id,
        actingTeamId: target.teamId,
        playerId: target.player?.id ?? null,
        pointType,
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setTarget(null);
      router.refresh();
    });
  }

  function onUndo() {
    startTransition(async () => {
      const result = await undoLastPoint(match.id);
      if (result.error) toast.error(result.error);
      else router.refresh();
    });
  }

  function submitSubstitution() {
    if (!swapTeamId || !playerOutId || !playerInId) return;
    const formData = new FormData();
    formData.set("playerOutId", playerOutId);
    formData.set("playerInId", playerInId);
    formData.set("setNumber", String(match.current_set));
    startTransition(async () => {
      const result = await addSubstitution(match.id, formData);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Cambio hecho");
      setSwapTeamId(null);
      setPlayerOutId("");
      setPlayerInId("");
      router.refresh();
    });
  }

  const swapOnCourt = swapTeamId === match.home_team_id ? homeOnCourt : awayOnCourt;
  const swapBench = swapTeamId === match.home_team_id ? homeBench : awayBench;

  return (
    <div className="space-y-4">
      <Scoreboard match={match} />

      {finished ? (
        <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-center text-sm font-medium text-emerald-800">
          Partido finalizado. El marcador ya no admite más puntos.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <Button
            size="xl"
            className="h-20 bg-sky-700 text-white hover:bg-sky-800"
            disabled={pending}
            onClick={() => openTeam(match.home_team_id, match.home_team.name)}
          >
            Punto {match.home_team.short_name || "local"}
          </Button>
          <Button
            size="xl"
            variant="accent"
            className="h-20"
            disabled={pending}
            onClick={() => openTeam(match.away_team_id, match.away_team.name)}
          >
            Punto {match.away_team.short_name || "visitante"}
          </Button>
        </div>
      )}

      <Roster
        title={match.home_team.name}
        logoUrl={match.home_team.logo_url}
        shortName={match.home_team.short_name}
        players={homeOnCourt}
        hasLineup={homeOnCourtIds !== null}
        canSubstitute={!finished && homeOnCourtIds !== null && homeBench.length > 0}
        disabled={finished || pending}
        onPick={(player) => openTeam(match.home_team_id, match.home_team.name, player)}
        onSubstitute={() => {
          setSwapTeamId(match.home_team_id);
          setPlayerOutId("");
          setPlayerInId("");
        }}
      />
      <Roster
        title={match.away_team.name}
        logoUrl={match.away_team.logo_url}
        shortName={match.away_team.short_name}
        players={awayOnCourt}
        hasLineup={awayOnCourtIds !== null}
        canSubstitute={!finished && awayOnCourtIds !== null && awayBench.length > 0}
        disabled={finished || pending}
        onPick={(player) => openTeam(match.away_team_id, match.away_team.name, player)}
        onSubstitute={() => {
          setSwapTeamId(match.away_team_id);
          setPlayerOutId("");
          setPlayerInId("");
        }}
      />

      <Button
        variant="outline"
        className="w-full"
        disabled={pending || events.length === 0}
        onClick={onUndo}
      >
        <Undo2 className="h-4 w-4" />
        Deshacer último punto
      </Button>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Historial del partido</h3>
        <PointHistory
          events={events}
          substitutions={substitutions}
          homeTeamId={match.home_team_id}
          limit={16}
          playerLinks={false}
        />
      </section>

      <Sheet
        open={!!swapTeamId}
        onOpenChange={(open) => {
          if (!open) setSwapTeamId(null);
        }}
      >
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Cambio</SheetTitle>
            <SheetDescription>
              El que sale deja de poder anotar. El que entra pasa a estar en pista.
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-3">
            <label className="block space-y-1.5 text-sm font-medium">
              Sale
              <select
                value={playerOutId}
                onChange={(event) => setPlayerOutId(event.target.value)}
                className="flex h-11 w-full rounded-xl border border-input bg-background px-3 text-sm font-normal"
              >
                <option value="">Jugador en pista</option>
                {swapOnCourt.map((player) => (
                  <option key={player.id} value={player.id}>
                    {formatJersey(player.jersey_number)} {player.full_name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1.5 text-sm font-medium">
              Entra
              <select
                value={playerInId}
                onChange={(event) => setPlayerInId(event.target.value)}
                className="flex h-11 w-full rounded-xl border border-input bg-background px-3 text-sm font-normal"
              >
                <option value="">Jugador del banquillo</option>
                {swapBench.map((player) => (
                  <option key={player.id} value={player.id}>
                    {formatJersey(player.jersey_number)} {player.full_name}
                  </option>
                ))}
              </select>
            </label>
            <Button
              variant="accent"
              className="w-full"
              disabled={pending || !playerOutId || !playerInId}
              onClick={submitSubstitution}
            >
              Confirmar cambio
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={!!target} onOpenChange={(open) => !open && setTarget(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>
              {target?.player
                ? `${target.player.full_name} ${formatJersey(target.player.jersey_number)}`
                : `Punto de ${target?.teamName ?? ""}`}
            </SheetTitle>
            <SheetDescription>
              Elige el tipo de acción. Un error propio suma el punto al rival.
            </SheetDescription>
          </SheetHeader>
          <div className="grid grid-cols-2 gap-3">
            {(Object.keys(POINT_TYPE_META) as PointType[]).map((type) => {
              const meta = POINT_TYPE_META[type];
              return (
                <button
                  key={type}
                  type="button"
                  disabled={pending}
                  onClick={() => submitPoint(type)}
                  className={cn(
                    "flex h-16 items-center justify-center rounded-2xl border-2 px-3 text-base font-bold shadow-sm transition-colors disabled:opacity-50",
                    meta.buttonClassName
                  )}
                >
                  {meta.label}
                </button>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

const Roster = memo(function Roster({
  title,
  logoUrl,
  shortName,
  players,
  hasLineup,
  canSubstitute,
  disabled,
  onPick,
  onSubstitute,
}: {
  title: string;
  logoUrl?: string | null;
  shortName?: string | null;
  players: Player[];
  hasLineup: boolean;
  canSubstitute: boolean;
  disabled: boolean;
  onPick: (player: Player) => void;
  onSubstitute: () => void;
}) {
  return (
    <section>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="flex min-w-0 items-center gap-2 text-sm font-semibold">
          <TeamLogo name={title} shortName={shortName} logoUrl={logoUrl} size="sm" />
          <span className="truncate">{hasLineup ? `${title} · En pista` : title}</span>
        </h3>
        {canSubstitute ? (
          <Button type="button" size="sm" variant="outline" disabled={disabled} onClick={onSubstitute}>
            Cambio
          </Button>
        ) : null}
      </div>
      {players.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {hasLineup
            ? "Nadie en pista ahora mismo. Revisa la alineación o los cambios."
            : "Define la alineación titular para asignar puntos a jugadores. Puedes anotar el punto al equipo."}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {players.map((player) => (
            <button
              key={player.id}
              type="button"
              disabled={disabled}
              onClick={() => onPick(player)}
              className="flex items-center gap-2 rounded-2xl border bg-card p-2 text-left shadow-sm active:scale-[0.99] disabled:opacity-50"
            >
              <Avatar className="h-10 w-10">
                <AvatarImage src={player.avatar_url ?? undefined} alt={player.full_name} />
                <AvatarFallback>{initials(player.full_name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{player.full_name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatJersey(player.jersey_number)}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
});
