"use client";

import { useRef, useState } from "react";
import { Search } from "lucide-react";
import { MatchViews } from "@/components/matches/match-views";
import { QueryError } from "@/components/query-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { browseFmvCompetitions, browseFmvGroups, browseFmvLeague } from "@/lib/actions/fmv-browse";
import type { FmvCompetitionHit, FmvGroupHit, FmvLeagueSnapshot } from "@/lib/federation/browse";
import { FMV_WEEKEND_NOTE } from "@/lib/federation/schedule";
import type { MatchWithTeams, Team } from "@/lib/types";

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

function foldText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function matchesGroupFilter(label: string, filter: string) {
  const tokens = foldText(filter)
    .split(/\s+/)
    .filter((token) => token.length >= 2);
  if (tokens.length === 0) return true;
  const haystack = foldText(label);
  return tokens.every((token) => haystack.includes(token));
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

export function FmvLeagueSearch() {
  const requestId = useRef(0);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [competitions, setCompetitions] = useState<FmvCompetitionHit[] | null>(null);
  const [competition, setCompetition] = useState<FmvCompetitionHit | null>(null);
  const [groups, setGroups] = useState<FmvGroupHit[] | null>(null);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [groupFilter, setGroupFilter] = useState("");
  const [league, setLeague] = useState<FmvLeagueSnapshot | null>(null);
  const [loadingLeague, setLoadingLeague] = useState(false);

  async function search(nextQuery = query) {
    const id = ++requestId.current;
    setSearching(true);
    setLoadingGroups(false);
    setLoadingLeague(false);
    setError(null);
    setCompetition(null);
    setGroups(null);
    setLeague(null);
    try {
      const result = await browseFmvCompetitions(nextQuery);
      if (id !== requestId.current) return;
      if ("error" in result) {
        setCompetitions(null);
        setError(result.error);
        return;
      }
      setCompetitions(result.competitions);
      if (result.competitions.length === 1) {
        await openCompetition(result.competitions[0], nextQuery, id);
      }
    } finally {
      if (id === requestId.current) setSearching(false);
    }
  }

  async function openCompetition(next: FmvCompetitionHit, sourceQuery = query, request = ++requestId.current) {
    setCompetition(next);
    setLeague(null);
    setGroups(null);
    setLoadingGroups(true);
    setError(null);
    try {
      const result = await browseFmvGroups(next.id, sourceQuery, next.name);
      if (request !== requestId.current) return;
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setGroups(result.groups);
      setGroupFilter(result.groupFilter);
    } finally {
      if (request === requestId.current) setLoadingGroups(false);
    }
  }

  async function openGroup(groupId: string) {
    const id = ++requestId.current;
    setLoadingLeague(true);
    setError(null);
    try {
      const result = await browseFmvLeague(groupId);
      if (id !== requestId.current) return;
      if ("error" in result) {
        setLeague(null);
        setError(result.error);
        return;
      }
      setLeague(result);
    } finally {
      if (id === requestId.current) setLoadingLeague(false);
    }
  }

  const visibleGroups = (groups ?? []).filter((group) =>
    matchesGroupFilter(group.label, groupFilter)
  );

  return (
    <div className="space-y-4">
      <form
        className="space-y-2"
        onSubmit={(event) => {
          event.preventDefault();
          void search();
        }}
      >
        <label htmlFor="fmv-league-search" className="block text-sm font-semibold">
          Buscar liga en fmvoley
        </label>
        <div className="flex gap-2">
          <Input
            id="fmv-league-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cadete femenino, infantil, senior…"
            autoComplete="off"
            className="w-auto min-w-0 flex-1"
          />
          <Button type="submit" disabled={searching} className="shrink-0">
            <Search className="h-4 w-4" />
            Buscar
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Elige una competición y un grupo. Se consulta al momento y no se guarda en la app.
        </p>
      </form>

      {error ? <QueryError message={error} /> : null}
      {searching ? <p className="text-sm text-muted-foreground">Buscando en fmvoley…</p> : null}

      {competitions && competitions.length === 0 && !searching ? (
        <p className="text-sm text-muted-foreground">
          No hay competiciones con ese nombre. Prueba con la categoría, por ejemplo Juvenil masculino.
        </p>
      ) : null}

      {competitions && competitions.length > 0 && !competition && !league ? (
        <div className="space-y-2">
          <p className="text-sm font-semibold">Competiciones</p>
          <div className="grid gap-2">
            {competitions.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => void openCompetition(item)}
                className="rounded-xl border bg-card px-3 py-2 text-left text-sm"
              >
                <span className="font-semibold">
                  {item.typeName === "Federadas" ? item.name : `${item.typeName} · ${item.name}`}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {loadingGroups ? <p className="text-sm text-muted-foreground">Cargando grupos…</p> : null}

      {competition && groups && !league ? (
        <div className="space-y-2">
          <div className="flex items-end justify-between gap-3">
            <p className="text-sm font-semibold">
              Grupos de {competition.name.trim()}
            </p>
            <button
              type="button"
              className="text-xs font-semibold text-muted-foreground"
              onClick={() => {
                setCompetition(null);
                setGroups(null);
              }}
            >
              Ver competiciones
            </button>
          </div>
          <Input
            value={groupFilter}
            onChange={(event) => setGroupFilter(event.target.value)}
            placeholder="Filtrar por división, fase o grupo"
            aria-label="Filtrar grupos"
          />
          {visibleGroups.length === 0 ? (
            <p className="text-sm text-muted-foreground">Ningún grupo coincide con ese filtro.</p>
          ) : (
            <div className="grid gap-2">
              {visibleGroups.map((group) => (
                <button
                  key={group.groupId}
                  type="button"
                  onClick={() => void openGroup(group.groupId)}
                  className="rounded-xl border bg-card px-3 py-2 text-left text-sm font-medium"
                >
                  {group.label}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {loadingLeague ? <p className="text-sm text-muted-foreground">Cargando partidos…</p> : null}

      {league ? (
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">{league.title}</h2>
              <p className="text-xs text-muted-foreground">
                {league.matches.length} partidos. Consulta en directo, sin sincronizar.
              </p>
            </div>
            <button
              type="button"
              className="shrink-0 text-xs font-semibold text-muted-foreground"
              onClick={() => setLeague(null)}
            >
              Cambiar grupo
            </button>
          </div>
          <MatchViews
            matches={league.matches.map(toCardMatch)}
            linked={false}
            resetKey={league.groupId}
          />
        </div>
      ) : null}
    </div>
  );
}
