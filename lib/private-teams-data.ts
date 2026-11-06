import { notFound } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { hasCoachAccess } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import { unwrapOne } from "@/lib/utils";
import type { Match, Player, PrivateLeague, Team } from "@/lib/types";

export type PrivateTeam = Team & { membership_role?: "editor" | "viewer" | null };
export type PrivateWorkspace = {
  league: PrivateLeague;
  teams: PrivateTeam[];
  players: Player[];
  matches: Match[];
  events: { match_id: string; player_id: string | null; point_type: import("@/lib/types").PointType }[];
  isOwner: boolean;
};
export async function requirePrivateMember() {
  const user = await getSessionUser();
  if (!user) {
    const { redirect } = await import("next/navigation");
    redirect("/login?next=/mis-equipos");
  }
  return user!;
}

export async function loadPrivateLeagues(): Promise<PrivateLeague[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("private_leagues").select("id, name, owner_id, created_at")
    .order("created_at");
  if (error) throw new Error("No se pudieron cargar tus ligas privadas.");
  // El filtro de propietario solo organiza el panel: la visibilidad efectiva la exige RLS.
  return (data ?? []) as PrivateLeague[];
}

export async function loadPrivateWorkspace(leagueId: string): Promise<PrivateWorkspace> {
  const user = await requirePrivateMember();
  const supabase = await createClient();
  const { data: leagueData, error: leagueError } = await supabase
    .from("private_leagues").select("id, name, owner_id, created_at")
    .eq("id", leagueId).maybeSingle();
  if (leagueError) throw new Error("No se pudo cargar la liga privada.");
  if (!leagueData) notFound();
  const league = leagueData as PrivateLeague;
  const { data: leagueTeams, error: teamsError } = await supabase
    .from("private_league_teams")
    .select("team:teams!team_id(*)")
    .eq("league_id", leagueId);
  if (teamsError) throw new Error("No se pudieron cargar los equipos privados.");
  const teams = (leagueTeams ?? []).map((row) => unwrapOne(row.team)).filter(Boolean) as Team[];
  const teamById = new Map(teams.map((team) => [team.id, team]));
  const { data: players, error: playersError } = await supabase
    .from("players").select("*").eq("is_private", true)
    .in("team_id", teams.length ? teams.map((team) => team.id) : ["00000000-0000-0000-0000-000000000000"])
    .order("jersey_number", { nullsFirst: false });
  if (playersError) throw new Error("No se pudo cargar la plantilla privada.");
  const { data: matches, error: matchesError } = await supabase
    .from("matches").select("*")
    .eq("private_league_id", leagueId).eq("is_private", true)
    .neq("status", "cancelled").order("scheduled_at", { ascending: false });
  if (matchesError) throw new Error("No se pudieron cargar los partidos privados.");
  const visibleMatches = (matches ?? []).filter((match) => teamById.has(match.home_team_id) || teamById.has(match.away_team_id));
  const relatedIds = [...new Set([...teams.map((team) => team.id), ...visibleMatches.flatMap((match) => [match.home_team_id, match.away_team_id])])];
  const { data: relatedTeamsData } = relatedIds.length > teams.length
    ? await supabase.from("teams").select("*").in("id", relatedIds).eq("is_private", true)
    : { data: teams };
  const allTeams = [...teams, ...((relatedTeamsData ?? []) as Team[]).filter((team) => !teamById.has(team.id))];
  const { data: events, error: eventsError } = await supabase
    .from("match_events").select("match_id, player_id, point_type")
    .in("match_id", visibleMatches.length ? visibleMatches.map((match) => match.id) : ["00000000-0000-0000-0000-000000000000"]);
  if (eventsError) throw new Error("No se pudieron cargar las estadísticas privadas.");
  return {
    league, teams: allTeams,
    events: (events ?? []) as PrivateWorkspace["events"],
    players: (players ?? []) as Player[],
    matches: visibleMatches as Match[],
    isOwner: user.profile.role === "admin" || (hasCoachAccess(user.profile.role) && league.owner_id === user.id),
  };
}

export function privateMatchWithTeams(match: Match, teams: Team[]) {
  const home = teams.find((team) => team.id === match.home_team_id);
  const away = teams.find((team) => team.id === match.away_team_id);
  if (!home || !away) notFound();
  return { ...match, home_team: home, away_team: away };
}
