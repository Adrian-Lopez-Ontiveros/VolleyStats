"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createMatch, updateMatch } from "@/lib/actions/matches";
import { TEAM_CATEGORIES, parseCategory, type TeamCategory } from "@/lib/categories";
import { LineupPicker } from "@/components/matches/lineup-picker";
import { SetScoreFields } from "@/components/matches/set-score-fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Match, MatchLineupEntry, Player, Team } from "@/lib/types";

function toLocalInput(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function MatchForm({
  match,
  teams,
  players = [],
  lineup = [],
  hasLiveEvents = false,
}: {
  match?: Match;
  teams: Team[];
  players?: Player[];
  lineup?: MatchLineupEntry[];
  hasLiveEvents?: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const homeTeam = teams.find((team) => team.id === match?.home_team_id);
  const [category, setCategory] = useState<TeamCategory>(
    parseCategory(homeTeam?.category ?? teams.find((team) => team.is_club_team)?.category)
  );
  const hasCategories = teams.some((team) => team.category);
  const leagueTeams = hasCategories
    ? teams.filter((team) => team.category === category)
    : teams;
  const clubTeam = leagueTeams.find((team) => team.is_club_team) ?? null;
  const [homeTeamId, setHomeTeamId] = useState(
    homeTeam?.category === category ? (match?.home_team_id ?? clubTeam?.id ?? "") : ""
  );
  const [awayTeamId, setAwayTeamId] = useState(() => {
    const away = teams.find((team) => team.id === match?.away_team_id);
    return away?.category === category ? (match?.away_team_id ?? "") : "";
  });
  const clubInMatch = Boolean(
    clubTeam && (clubTeam.id === homeTeamId || clubTeam.id === awayTeamId)
  );
  const clubPlayers = useMemo(
    () => players.filter((player) => player.team_id === clubTeam?.id),
    [players, clubTeam?.id]
  );
  const homeLabel = leagueTeams.find((team) => team.id === homeTeamId)?.short_name || "Local";
  const awayLabel = leagueTeams.find((team) => team.id === awayTeamId)?.short_name || "Visitante";
  const lockTeams = Boolean(match && match.status !== "scheduled");

  async function onSubmit(formData: FormData) {
    setPending(true);
    const result = match
      ? await updateMatch(match.id, formData)
      : await createMatch(formData);
    setPending(false);
    if (result?.error) toast.error(result.error);
  }

  return (
    <form action={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="category">Liga</Label>
        <select
          id="category"
          value={category}
          disabled={lockTeams}
          onChange={(event) => {
            const next = parseCategory(event.target.value);
            setCategory(next);
            setHomeTeamId("");
            setAwayTeamId("");
          }}
          className="flex h-11 w-full rounded-xl border border-input bg-card px-3 text-sm shadow-sm"
        >
          {TEAM_CATEGORIES.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </div>
      {hasCategories && leagueTeams.length < 2 ? (
        <p className="rounded-xl bg-secondary px-3 py-2 text-xs text-muted-foreground">
          Añade el equipo del club y al menos un rival de esta liga antes de crear el partido.
        </p>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor="homeTeamId">Equipo local</Label>
        <select
          key={`${category}-home`}
          id="homeTeamId"
          name="homeTeamId"
          required
          value={homeTeamId}
          disabled={lockTeams}
          onChange={(event) => setHomeTeamId(event.target.value)}
          className="flex h-11 w-full rounded-xl border border-input bg-card px-3 text-sm shadow-sm"
        >
          <option value="" disabled>
            Selecciona equipo local
          </option>
          {leagueTeams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.is_club_team ? `${team.name} (club)` : team.name}
            </option>
          ))}
        </select>
        {lockTeams ? <input type="hidden" name="homeTeamId" value={homeTeamId} /> : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="awayTeamId">Equipo visitante</Label>
        <select
          key={`${category}-away`}
          id="awayTeamId"
          name="awayTeamId"
          required
          value={awayTeamId}
          disabled={lockTeams}
          onChange={(event) => setAwayTeamId(event.target.value)}
          className="flex h-11 w-full rounded-xl border border-input bg-card px-3 text-sm shadow-sm"
        >
          <option value="" disabled>
            Selecciona equipo visitante
          </option>
          {leagueTeams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.is_club_team ? `${team.name} (club)` : team.name}
            </option>
          ))}
        </select>
        {lockTeams ? <input type="hidden" name="awayTeamId" value={awayTeamId} /> : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="scheduledAt">Fecha y hora</Label>
        <Input
          id="scheduledAt"
          name="scheduledAt"
          type="datetime-local"
          required
          defaultValue={toLocalInput(match?.scheduled_at)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="location">Lugar</Label>
        <Input
          id="location"
          name="location"
          defaultValue={match?.location ?? ""}
          placeholder="Pabellón municipal"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">Notas</Label>
        <Textarea
          id="notes"
          name="notes"
          defaultValue={match?.notes ?? ""}
          placeholder="Jornada, competición..."
        />
      </div>
      {hasLiveEvents ? (
        <p className="rounded-xl bg-secondary px-3 py-2 text-xs text-muted-foreground">
          Este partido tiene seguimiento en vivo. El marcador de sets se calcula con los
          puntos registrados y no se puede editar a mano.
        </p>
      ) : (
        <SetScoreFields
          setScores={match?.set_scores}
          homeLabel={homeLabel}
          awayLabel={awayLabel}
        />
      )}
      {clubInMatch && clubTeam ? (
        <LineupPicker
          key={clubTeam.id}
          teamId={clubTeam.id}
          teamName={clubTeam.name}
          players={clubPlayers}
          lineup={lineup}
        />
      ) : (
        <p className="rounded-xl bg-secondary px-3 py-2 text-xs text-muted-foreground">
          Selecciona el equipo del club como local o visitante para definir la alineación
          titular.
        </p>
      )}
      <div className="flex gap-2">
        <Button type="button" variant="outline" className="flex-1" onClick={() => router.back()}>
          Cancelar
        </Button>
        <Button type="submit" variant="accent" className="flex-1" disabled={pending}>
          {pending ? "Guardando..." : match ? "Guardar cambios" : "Crear partido"}
        </Button>
      </div>
    </form>
  );
}
