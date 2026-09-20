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
import { isoToDatetimeLocalMadrid } from "@/lib/federation/schedule";
import { isFriendlyMatch } from "@/components/matches/match-kind";
import { maxSetsOf, setsToWinOf } from "@/lib/constants";
import type { Match, MatchLineupEntry, Player, Team } from "@/lib/types";

const CUSTOM_TEAM = "__custom__";

function toLocalInput(value?: string) {
  if (!value) return "";
  return isoToDatetimeLocalMadrid(value);
}

function isOneOff(team: Team) {
  return Boolean(team.is_one_off);
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
  const listedTeams = leagueTeams.filter((team) => !isOneOff(team));
  const oneOffTeams = leagueTeams.filter(isOneOff);
  const clubTeam = listedTeams.find((team) => team.is_club_team) ?? null;
  const [homeTeamId, setHomeTeamId] = useState(
    homeTeam?.category === category ? (match?.home_team_id ?? clubTeam?.id ?? "") : ""
  );
  const [awayTeamId, setAwayTeamId] = useState(() => {
    const away = teams.find((team) => team.id === match?.away_team_id);
    if (away?.category === category) return match?.away_team_id ?? "";
    return match ? "" : CUSTOM_TEAM;
  });
  const [homeTeamName, setHomeTeamName] = useState("");
  const [awayTeamName, setAwayTeamName] = useState("");
  const clubInMatch = Boolean(
    clubTeam && (clubTeam.id === homeTeamId || clubTeam.id === awayTeamId)
  );
  const clubPlayers = useMemo(
    () => players.filter((player) => player.team_id === clubTeam?.id),
    [players, clubTeam?.id]
  );
  const homeLabel =
    homeTeamId === CUSTOM_TEAM
      ? homeTeamName.trim() || "Local"
      : listedTeams.concat(oneOffTeams).find((team) => team.id === homeTeamId)?.short_name ||
        "Local";
  const awayLabel =
    awayTeamId === CUSTOM_TEAM
      ? awayTeamName.trim() || "Visitante"
      : listedTeams.concat(oneOffTeams).find((team) => team.id === awayTeamId)?.short_name ||
        "Visitante";
  const lockTeams = Boolean(match && match.status !== "scheduled");
  const friendly = !match || isFriendlyMatch(match);
  const [setsToWin, setSetsToWin] = useState<2 | 3>(setsToWinOf(match) === 2 ? 2 : 3);

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
          name="category"
          value={category}
          disabled={lockTeams}
          onChange={(event) => {
            const next = parseCategory(event.target.value);
            setCategory(next);
            const nextClub = teams.find((team) => team.is_club_team && team.category === next);
            setHomeTeamId(nextClub?.id ?? CUSTOM_TEAM);
            setAwayTeamId(CUSTOM_TEAM);
            setHomeTeamName("");
            setAwayTeamName("");
          }}
          className="flex h-11 w-full rounded-xl border border-input bg-card px-3 text-sm shadow-sm"
        >
          {TEAM_CATEGORIES.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
        {lockTeams ? <input type="hidden" name="category" value={category} /> : null}
      </div>
      {hasCategories && !clubTeam ? (
        <p className="rounded-xl bg-secondary px-3 py-2 text-xs text-muted-foreground">
          No hay equipo del club en esta liga. Puedes escribir los dos nombres para un amistoso.
        </p>
      ) : (
        <p className="rounded-xl bg-secondary px-3 py-2 text-xs text-muted-foreground">
          Los partidos que creas aquí son amistosos: no cuentan en la liga FMV. Si el rival no
          está en la clasificación, elige «Escribir nombre».
        </p>
      )}
      <TeamSideField
        side="home"
        label="Equipo local"
        teamId={homeTeamId}
        teamName={homeTeamName}
        listedTeams={listedTeams}
        oneOffTeams={oneOffTeams}
        lockTeams={lockTeams}
        onTeamIdChange={setHomeTeamId}
        onTeamNameChange={setHomeTeamName}
      />
      <TeamSideField
        side="away"
        label="Equipo visitante"
        teamId={awayTeamId}
        teamName={awayTeamName}
        listedTeams={listedTeams}
        oneOffTeams={oneOffTeams}
        lockTeams={lockTeams}
        onTeamIdChange={setAwayTeamId}
        onTeamNameChange={setAwayTeamName}
      />
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
      {friendly ? (
        <div className="space-y-2">
          <Label>Formato</Label>
          <input type="hidden" name="setsToWin" value={setsToWin} />
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setSetsToWin(2)}
              className={
                setsToWin === 2
                  ? "h-11 rounded-xl border-2 border-orange-500 bg-orange-50 text-sm font-semibold text-orange-950"
                  : "h-11 rounded-xl border bg-card text-sm font-medium text-muted-foreground"
              }
            >
              Al mejor de 3
            </button>
            <button
              type="button"
              onClick={() => setSetsToWin(3)}
              className={
                setsToWin === 3
                  ? "h-11 rounded-xl border-2 border-orange-500 bg-orange-50 text-sm font-semibold text-orange-950"
                  : "h-11 rounded-xl border bg-card text-sm font-medium text-muted-foreground"
              }
            >
              Al mejor de 5
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            {setsToWin === 2
              ? "Gana el primero que se lleve 2 sets. El 3º, si hace falta, es a 15."
              : "Gana el primero que se lleve 3 sets. El 5º, si hace falta, es a 15."}
          </p>
        </div>
      ) : (
        <input type="hidden" name="setsToWin" value={3} />
      )}
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
          maxSets={maxSetsOf(setsToWin)}
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

function TeamSideField({
  side,
  label,
  teamId,
  teamName,
  listedTeams,
  oneOffTeams,
  lockTeams,
  onTeamIdChange,
  onTeamNameChange,
}: {
  side: "home" | "away";
  label: string;
  teamId: string;
  teamName: string;
  listedTeams: Team[];
  oneOffTeams: Team[];
  lockTeams: boolean;
  onTeamIdChange: (value: string) => void;
  onTeamNameChange: (value: string) => void;
}) {
  const custom = teamId === CUSTOM_TEAM;
  const idName = side === "home" ? "homeTeamId" : "awayTeamId";
  const nameName = side === "home" ? "homeTeamName" : "awayTeamName";

  return (
    <div className="space-y-2">
      <Label htmlFor={idName}>{label}</Label>
      <select
        key={`${side}-select`}
        id={idName}
        name={idName}
        required
        value={teamId}
        disabled={lockTeams}
        onChange={(event) => onTeamIdChange(event.target.value)}
        className="flex h-11 w-full rounded-xl border border-input bg-card px-3 text-sm shadow-sm"
      >
        <option value="" disabled>
          Selecciona equipo
        </option>
        {listedTeams.map((team) => (
          <option key={team.id} value={team.id}>
            {team.is_club_team ? `${team.name} (club)` : team.name}
          </option>
        ))}
        {oneOffTeams.length > 0 ? (
          <optgroup label="Usados en amistosos">
            {oneOffTeams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </optgroup>
        ) : null}
        <option value={CUSTOM_TEAM}>Escribir nombre…</option>
      </select>
      {lockTeams ? <input type="hidden" name={idName} value={teamId} /> : null}
      {custom ? (
        <Input
          id={nameName}
          name={nameName}
          value={teamName}
          onChange={(event) => onTeamNameChange(event.target.value)}
          placeholder="Nombre del equipo"
          required
          disabled={lockTeams}
        />
      ) : null}
    </div>
  );
}
