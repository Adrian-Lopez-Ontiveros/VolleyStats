import { notFound } from "next/navigation";
import { isPrivateRosterTeam } from "@/lib/private-teams";
import { requireCoach } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { unwrapOne } from "@/lib/utils";
import type { Match, Player, PrivateLeague, Team } from "@/lib/types";

export type PrivateTeam = Team;

export type PrivateWorkspace = {
  league: PrivateLeague;
  teams: PrivateTeam[];
  players: Player[];
  matches: Match[];
  events: { match_id: string; player_id: string | null; point_type: import("@/lib/types").PointType }[];
};

/** Solo entrenadores y administradores. La propiedad la vuelve a exigir RLS. */
export async function requirePrivateMember() {
  return requireCoach();
}

/** Las ligas existen solo porque las exigen los RPC; no forman parte de la interfaz. */
export async function loadPrivateTeams(): Promise<PrivateTeam[]> {
  await requirePrivateMember();
  const supabase = await createClient();
  const { data, error } = await supabase.from("teams").select("*").eq("is_private", true).eq("is_one_off", false).order("created_at");
  if (error) throw new Error("No se pudieron cargar tus equipos privados.");
  return (data ?? []) as Team[];
}

export type PrivateTeamsOverview = {
  teams: PrivateTeam[];
  playerCounts: Record<string, number>;
  matches: Match[];
  matchTeams: PrivateTeam[];
};

/** Resumen ligero del espacio privado: dos consultas adicionales, sin RLS nuevo. */
export async function loadPrivateTeamsOverview(): Promise<PrivateTeamsOverview> {
  const teams = await loadPrivateTeams();
  if (teams.length === 0) return { teams, playerCounts: {}, matches: [], matchTeams: [] };
  const supabase = await createClient();
  const leagueIds = [...new Set(teams.flatMap((team) => team.private_league_id ?? []))];
  const [{ data: players, error: playersError }, { data: matches, error: matchesError }] = await Promise.all([
    supabase.from("players").select("team_id").eq("is_private", true).in("team_id", teams.map((team) => team.id)),
    supabase.from("matches").select("id, home_team_id, away_team_id, scheduled_at, status").eq("is_private", true).neq("status", "cancelled")
      .in("private_league_id", leagueIds).order("scheduled_at", { ascending: false }),
  ]);
  if (playersError || matchesError) throw new Error("No se pudo cargar el resumen de tus equipos privados.");
  const playerCounts = Object.fromEntries(teams.map((team) => [team.id, 0]));
  for (const player of players ?? []) {
    if (player.team_id && player.team_id in playerCounts) playerCounts[player.team_id] += 1;
  }
  const matchTeamIds = [...new Set((matches ?? []).flatMap((match) => [match.home_team_id, match.away_team_id]))];
  const { data: matchTeams, error: teamsError } = await supabase.from("teams").select("id, name, logo_url, short_name").eq("is_private", true).in("id", matchTeamIds);
  if (teamsError) throw new Error("No se pudo cargar el rival de tus partidos privados.");
  return { teams, playerCounts, matches: (matches ?? []) as Match[], matchTeams: (matchTeams ?? []) as PrivateTeam[] };
}

/** Carga el equipo, su plantilla y los participantes de sus partidos privados. */
export async function loadPrivateWorkspace(teamId: string): Promise<PrivateWorkspace> {
  await requirePrivateMember();
  const supabase = await createClient();
  const { data: selected, error: selectedError } = await supabase
    .from("teams").select("*").eq("id", teamId).eq("is_private", true).maybeSingle();
  if (selectedError) throw new Error("No se pudo cargar el equipo privado.");
  if (!selected) notFound();
  const leagueId = selected.private_league_id;
  if (!leagueId) notFound();

  const [{ data: leagueData, error: leagueError }, { data: leagueTeams, error: teamsError }] = await Promise.all([
    supabase.from("private_leagues").select("id, name, owner_id, created_at").eq("id", leagueId).maybeSingle(),
    supabase.from("private_league_teams").select("team:teams!team_id(*)").eq("league_id", leagueId),
  ]);
  if (leagueError || teamsError) throw new Error("No se pudieron cargar los equipos privados.");
  if (!leagueData) notFound();
  const league = leagueData as PrivateLeague;
  const teams = ((leagueTeams ?? []).map((row) => unwrapOne(row.team)).filter(Boolean) as Team[])
    .filter(isPrivateRosterTeam);
  if (selected.is_one_off) notFound();
  const { data: players, error: playersError } = await supabase
    .from("players").select("*").eq("is_private", true)
    .in("team_id", teams.length ? teams.map((team) => team.id) : ["00000000-0000-0000-0000-000000000000"])
    .order("jersey_number", { nullsFirst: false });
  if (playersError) throw new Error("No se pudo cargar la plantilla privada.");
  const { data: matches, error: matchesError } = await supabase
    .from("matches").select("*").eq("private_league_id", leagueId).eq("is_private", true)
    .neq("status", "cancelled").order("scheduled_at", { ascending: false });
  if (matchesError) throw new Error("No se pudieron cargar los partidos privados.");
  const visibleMatches = (matches ?? []).filter((match) => match.home_team_id === teamId || match.away_team_id === teamId);
  const matchTeamIds = [...new Set(visibleMatches.flatMap((match) => [match.home_team_id, match.away_team_id]))];
  const { data: matchTeams, error: matchTeamsError } = await supabase
    .from("teams").select("*").eq("is_private", true)
    .in("id", matchTeamIds.length ? matchTeamIds : ["00000000-0000-0000-0000-000000000000"]);
  if (matchTeamsError) throw new Error("No se pudo cargar el rival privado.");
  for (const matchTeam of (matchTeams ?? []) as Team[]) {
    if (!teams.some((team) => team.id === matchTeam.id)) teams.push(matchTeam as PrivateTeam);
  }
  const { data: events, error: eventsError } = await supabase
    .from("match_events").select("match_id, player_id, point_type")
    .in("match_id", visibleMatches.length ? visibleMatches.map((match) => match.id) : ["00000000-0000-0000-0000-000000000000"]);
  if (eventsError) throw new Error("No se pudieron cargar las estadísticas privadas.");
  return {
    league, teams,
    events: (events ?? []) as PrivateWorkspace["events"],
    players: (players ?? []) as Player[],
    matches: visibleMatches as Match[],
  };
}

export function privateMatchWithTeams(match: Match, teams: Team[]) {
  const home = teams.find((team) => team.id === match.home_team_id);
  const away = teams.find((team) => team.id === match.away_team_id);
  if (!home || !away) notFound();
  return { ...match, home_team: home, away_team: away };
}
