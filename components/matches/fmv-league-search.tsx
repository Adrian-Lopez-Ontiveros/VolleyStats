"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { JornadaBar } from "@/components/matches/jornada-bar";
import { LeagueStandings } from "@/components/matches/league-standings";
import { MatchViews } from "@/components/matches/match-views";
import { QueryError } from "@/components/query-error";
import { Label } from "@/components/ui/label";
import {
  browseFmvCompetitionsForType,
  browseFmvDivisionsForCompetition,
  browseFmvGroupsForPhase,
  browseFmvLeague,
  browseFmvPhasesForDivision,
  browseFmvTypes,
} from "@/lib/actions/fmv-browse";
import type { FmvLeagueSnapshot } from "@/lib/federation/browse";
import { federationRoundNumber, standingsFromLeagueMatches } from "@/lib/federation/rounds";
import { FMV_WEEKEND_NOTE } from "@/lib/federation/schedule";
import type { MatchWithTeams, Team } from "@/lib/types";

type Option = { id: string; name: string };

const SELECT_CLASS =
  "flex h-11 w-full rounded-xl border border-input bg-card px-3 text-sm shadow-sm disabled:cursor-not-allowed disabled:opacity-50";

function toTeam(id: string, name: string, at: string): Team {
  return {
    id: id ? `fmv-${id}` : `fmv-name-${name}`,
    name,
    short_name: null,
    logo_url: null,
    city: null,
    category: null,
    is_club_team: false,
    federation_team_id: id || null,
    created_at: at,
    updated_at: at,
  };
}

function toCardMatch(match: FmvLeagueSnapshot["matches"][number]): MatchWithTeams {
  const home = toTeam(match.homeId, match.homeName, match.scheduledAt);
  const away = toTeam(match.awayId, match.awayName, match.scheduledAt);
  return {
    id: `fmv-${match.id}`,
    home_team_id: home.id,
    away_team_id: away.id,
    scheduled_at: match.scheduledAt,
    location: match.location || null,
    status: match.status,
    home_sets: match.homeSets,
    away_sets: match.awaySets,
    current_set: Math.max(1, match.homeSets + match.awaySets),
    home_points: 0,
    away_points: 0,
    set_scores: match.setScores,
    notes: match.schedulePrecision === "exact" ? null : FMV_WEEKEND_NOTE,
    created_by: null,
    is_federation: true,
    federation_match_id: match.id,
    federation_round: match.round,
    sets_to_win: 3,
    created_at: match.scheduledAt,
    updated_at: match.scheduledAt,
    home_team: home,
    away_team: away,
  };
}

function isError(result: Option[] | { error: string }): result is { error: string } {
  return !Array.isArray(result);
}

export function FmvLeagueSearch() {
  const requestId = useRef(0);
  const [error, setError] = useState<string | null>(null);
  const [loadingTypes, setLoadingTypes] = useState(true);
  const [loadingLevel, setLoadingLevel] = useState(false);
  const [loadingLeague, setLoadingLeague] = useState(false);

  const [types, setTypes] = useState<Option[]>([]);
  const [competitions, setCompetitions] = useState<Option[]>([]);
  const [divisions, setDivisions] = useState<Option[]>([]);
  const [phases, setPhases] = useState<Option[]>([]);
  const [groups, setGroups] = useState<Option[]>([]);

  const [typeId, setTypeId] = useState("");
  const [competitionId, setCompetitionId] = useState("");
  const [divisionId, setDivisionId] = useState("");
  const [phaseId, setPhaseId] = useState("");
  const [groupId, setGroupId] = useState("");

  const [league, setLeague] = useState<FmvLeagueSnapshot | null>(null);
  const [jornada, setJornada] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      const result = await browseFmvTypes();
      if (!active) return;
      if (isError(result)) setError(result.error);
      else setTypes(result);
      setLoadingTypes(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  function clearBelowType() {
    setCompetitionId("");
    setDivisionId("");
    setPhaseId("");
    setGroupId("");
    setDivisions([]);
    setPhases([]);
    setGroups([]);
    setLeague(null);
    setJornada(null);
  }

  async function applyType(nextTypeId: string) {
    const id = ++requestId.current;
    setTypeId(nextTypeId);
    clearBelowType();
    setCompetitions([]);
    if (!nextTypeId) return;
    setLoadingLevel(true);
    setError(null);
    const result = await browseFmvCompetitionsForType(nextTypeId);
    if (id !== requestId.current) return;
    if (isError(result)) setError(result.error);
    else setCompetitions(result);
    setLoadingLevel(false);
  }

  async function applyCompetition(nextCompetitionId: string) {
    const id = ++requestId.current;
    setCompetitionId(nextCompetitionId);
    setDivisionId("");
    setPhaseId("");
    setGroupId("");
    setPhases([]);
    setGroups([]);
    setLeague(null);
    setJornada(null);
    setDivisions([]);
    if (!nextCompetitionId) return;
    setLoadingLevel(true);
    setError(null);
    const result = await browseFmvDivisionsForCompetition(nextCompetitionId);
    if (id !== requestId.current) return;
    if (isError(result)) setError(result.error);
    else setDivisions(result);
    setLoadingLevel(false);
  }

  async function applyDivision(nextDivisionId: string) {
    const id = ++requestId.current;
    setDivisionId(nextDivisionId);
    setPhaseId("");
    setGroupId("");
    setGroups([]);
    setLeague(null);
    setJornada(null);
    setPhases([]);
    if (!nextDivisionId) return;
    setLoadingLevel(true);
    setError(null);
    const result = await browseFmvPhasesForDivision(nextDivisionId);
    if (id !== requestId.current) return;
    if (isError(result)) setError(result.error);
    else setPhases(result);
    setLoadingLevel(false);
  }

  async function applyPhase(nextPhaseId: string) {
    const id = ++requestId.current;
    setPhaseId(nextPhaseId);
    setGroupId("");
    setLeague(null);
    setJornada(null);
    setGroups([]);
    if (!nextPhaseId) return;
    setLoadingLevel(true);
    setError(null);
    const result = await browseFmvGroupsForPhase(nextPhaseId);
    if (id !== requestId.current) return;
    if (isError(result)) setError(result.error);
    else setGroups(result);
    setLoadingLevel(false);
  }

  async function applyGroup(nextGroupId: string) {
    const id = ++requestId.current;
    setGroupId(nextGroupId);
    setLeague(null);
    setJornada(null);
    if (!nextGroupId) return;
    setLoadingLeague(true);
    setError(null);
    const result = await browseFmvLeague(nextGroupId);
    if (id !== requestId.current) return;
    if ("error" in result) setError(result.error);
    else setLeague(result);
    setLoadingLeague(false);
  }

  const cards = useMemo(() => (league ? league.matches.map(toCardMatch) : []), [league]);
  const visible = useMemo(() => {
    if (jornada == null) return cards;
    return cards.filter((match) => federationRoundNumber(match.federation_round) === jornada);
  }, [cards, jornada]);
  const standings = useMemo(
    () => (league ? standingsFromLeagueMatches(cards, jornada) : null),
    [cards, jornada, league]
  );

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-semibold">Cualquier liga de fmvoley</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Elige tipo, competición, división, fase y grupo. Se consulta al momento y no se guarda.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Tipo" htmlFor="browseType">
          <select
            id="browseType"
            value={typeId}
            disabled={loadingTypes}
            onChange={(event) => void applyType(event.target.value)}
            className={SELECT_CLASS}
          >
            <option value="" disabled>
              {loadingTypes ? "Cargando…" : "Tipo de competición"}
            </option>
            {types.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Competición" htmlFor="browseCompetition">
          <select
            id="browseCompetition"
            value={competitionId}
            disabled={!typeId || loadingLevel}
            onChange={(event) => void applyCompetition(event.target.value)}
            className={SELECT_CLASS}
          >
            <option value="">Competición</option>
            {competitions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="División" htmlFor="browseDivision">
          <select
            id="browseDivision"
            value={divisionId}
            disabled={!competitionId || loadingLevel}
            onChange={(event) => void applyDivision(event.target.value)}
            className={SELECT_CLASS}
          >
            <option value="">División</option>
            {divisions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Fase" htmlFor="browsePhase">
          <select
            id="browsePhase"
            value={phaseId}
            disabled={!divisionId || loadingLevel}
            onChange={(event) => void applyPhase(event.target.value)}
            className={SELECT_CLASS}
          >
            <option value="">Fase</option>
            {phases.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Grupo" htmlFor="browseGroup">
          <select
            id="browseGroup"
            value={groupId}
            disabled={!phaseId || loadingLevel || loadingLeague}
            onChange={(event) => void applyGroup(event.target.value)}
            className={SELECT_CLASS}
          >
            <option value="">Grupo</option>
            {groups.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {error ? <QueryError message={error} /> : null}
      {loadingLevel ? <p className="text-sm text-muted-foreground">Cargando opciones…</p> : null}
      {loadingLeague ? <p className="text-sm text-muted-foreground">Cargando partidos…</p> : null}

      {league && standings ? (
        <div className="space-y-3">
          <div>
            <h2 className="text-sm font-semibold">{league.title}</h2>
            <p className="text-xs text-muted-foreground">
              {league.matches.length} partidos. Consulta en directo, sin sincronizar.
            </p>
          </div>
          <JornadaBar value={jornada} onChange={setJornada} />
          <MatchViews
            matches={visible}
            linked={false}
            empty={
              jornada == null
                ? "Esta liga no tiene partidos publicados."
                : "No hay partidos en esta jornada."
            }
          />
          <LeagueStandings
            jornada={jornada}
            rows={standings.rows}
            unfinished={standings.unfinished}
          />
        </div>
      ) : null}
    </div>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}
