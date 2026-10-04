import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { TEAM_CATEGORIES, type TeamCategory } from "@/lib/categories";
import {
  fetchFmvGroupInfo,
  fetchFmvMatches,
  fetchFmvTeams,
  locateFmvGroupsByTeamIds,
  type FmvMatch,
  type FmvTeam,
} from "@/lib/federation/client";
import { isClubTeamName } from "@/lib/federation/leagues";
import { federationNotesForSchedule } from "@/lib/federation/schedule";
import { matchScoreFromSets } from "@/lib/match-result";
import type { Team } from "@/lib/types";

export type FederationSyncReport = {
  groups: number;
  groupName: string;
  teamsCreated: number;
  teamsLinked: number;
  teamsRemoved: number;
  matchesCreated: number;
  matchesUpdated: number;
  matchesSkipped: number;
  matchesRemoved: number;
  errors: string[];
};

export type ScheduledFederationSyncKind = "results" | "schedules";

function emptyReport(groupName = ""): FederationSyncReport {
  return {
    groups: 0,
    groupName,
    teamsCreated: 0,
    teamsLinked: 0,
    teamsRemoved: 0,
    matchesCreated: 0,
    matchesUpdated: 0,
    matchesSkipped: 0,
    matchesRemoved: 0,
    errors: [],
  };
}

export async function importFederationGroup(
  supabase: SupabaseClient,
  groupId: string,
  category: TeamCategory,
  options?: { wipe?: boolean; scores?: boolean }
): Promise<FederationSyncReport> {
  if (!groupId) throw new Error("Selecciona un grupo de la federación.");
  if (!TEAM_CATEGORIES.some((item) => item.id === category)) {
    throw new Error("La liga de destino no es válida.");
  }

  const report = emptyReport();
  if (options?.wipe) {
    const cleared = await replaceCategoryFederationData(supabase, category);
    report.teamsRemoved = cleared.teamsRemoved;
    report.matchesRemoved = cleared.matchesRemoved;
  }

  const group = await fetchFmvGroupInfo(groupId);
  report.groups = 1;
  report.groupName = group.path;

  const teams = await fetchFmvTeams(group.id);
  for (const team of teams) {
    const result = await upsertFederationTeam(supabase, team, category);
    if (result === "created") report.teamsCreated += 1;
    if (result === "linked") report.teamsLinked += 1;
  }

  const matches = await fetchFmvMatches(group.id, { scores: options?.scores !== false });
  for (const match of matches) {
    const result = await upsertFederationMatch(supabase, match, category);
    report[result] += 1;
  }

  revalidatePath("/partidos");
  revalidatePath("/liga");
  revalidatePath("/equipos");
  revalidatePath("/admin");
  return report;
}

export type StoredLeagueTarget = {
  category: TeamCategory;
  groupId: string;
  path: string;
};

/** Leagues already linked to each club team. Does not pick another división. */
export async function listStoredClubLeagueTargets(
  supabase: SupabaseClient
): Promise<{ targets: StoredLeagueTarget[]; errors: string[] }> {
  const { data, error } = await supabase
    .from("teams")
    .select("category, federation_team_id")
    .eq("is_club_team", true);

  if (error) throw new Error(error.message);

  const clubs = (data ?? []).filter(
    (team): team is { category: TeamCategory; federation_team_id: string } =>
      TEAM_CATEGORIES.some((item) => item.id === team.category) && Boolean(team.federation_team_id)
  );

  const located = await locateFmvGroupsByTeamIds(clubs.map((club) => club.federation_team_id));
  const byTeamId = new Map(located.map((group) => [group.teamId, group]));
  const targets: StoredLeagueTarget[] = [];
  const errors: string[] = [];

  for (const category of TEAM_CATEGORIES) {
    const club = clubs.find((item) => item.category === category.id);
    if (!club) {
      errors.push(`${category.label}: el equipo del club no está enlazado con FMVoley.`);
      continue;
    }
    const group = byTeamId.get(club.federation_team_id);
    if (!group) {
      errors.push(`${category.label}: FMVoley no tiene la liga de este equipo.`);
      continue;
    }
    targets.push({ category: category.id, groupId: group.groupId, path: group.path });
  }

  return { targets, errors };
}

/** Updates matches that already exist. Drops rivals that are not in the club team's group. */
export async function refreshStoredLeague(
  supabase: SupabaseClient,
  category: TeamCategory,
  groupId: string,
  options?: { scores?: boolean }
): Promise<FederationSyncReport> {
  if (!groupId) throw new Error("No hay grupo de la federación para esta liga.");
  if (!TEAM_CATEGORIES.some((item) => item.id === category)) {
    throw new Error("La liga de destino no es válida.");
  }

  const { data: club, error: clubError } = await supabase
    .from("teams")
    .select("federation_team_id")
    .eq("is_club_team", true)
    .eq("category", category)
    .not("federation_team_id", "is", null)
    .limit(1)
    .maybeSingle();
  if (clubError) throw new Error(clubError.message);
  if (!club?.federation_team_id) {
    throw new Error("El equipo del club no está enlazado con FMVoley.");
  }

  const [groupTeams, groupInfo] = await Promise.all([
    fetchFmvTeams(groupId),
    fetchFmvGroupInfo(groupId),
  ]);
  if (!groupTeams.some((team) => team.id === club.federation_team_id)) {
    throw new Error("Esa liga no es la de tu equipo. No he cambiado nada.");
  }

  const report = emptyReport(groupInfo.path);
  report.groups = 1;

  const matches = await fetchFmvMatches(groupId, { scores: options?.scores !== false });
  const existingByFedId = await loadMatchesByFederationId(
    supabase,
    matches.map((match) => match.id)
  );

  for (const match of matches) {
    const existing = existingByFedId.get(match.id);
    if (!existing) continue;
    const result = await updateExistingFederationMatch(supabase, existing, match);
    report[result] += 1;
  }

  const removed = await removeRivalsOutsideGroup(
    supabase,
    category,
    new Set(groupTeams.map((team) => team.id))
  );
  report.teamsRemoved = removed.teamsRemoved;
  report.matchesRemoved = removed.matchesRemoved;
  report.errors.push(...removed.errors);

  revalidatePath("/partidos");
  revalidatePath("/liga");
  revalidatePath("/equipos");
  revalidatePath("/admin");
  return report;
}

export async function runScheduledFederationSync(
  supabase: SupabaseClient,
  kind: ScheduledFederationSyncKind
) {
  const { targets, errors } = await listStoredClubLeagueTargets(supabase);
  if (targets.length === 0 && errors.length === 0) {
    errors.push("No hay ligas del club enlazadas con FMVoley.");
  }

  const settled = await Promise.allSettled(
    targets.map((target) =>
      refreshStoredLeague(supabase, target.category, target.groupId, {
        scores: kind === "results",
      })
    )
  );

  const synced: FederationSyncReport[] = [];
  settled.forEach((result, index) => {
    const target = targets[index];
    if (result.status === "fulfilled") {
      result.value.groupName = target.path;
      synced.push(result.value);
      return;
    }
    const reason = result.reason;
    errors.push(`${target.path}: ${reason instanceof Error ? reason.message : "Error FMV"}`);
  });

  return { kind, synced, errors };
}

async function replaceCategoryFederationData(supabase: SupabaseClient, category: TeamCategory) {
  const { data: teams, error: teamsError } = await supabase
    .from("teams")
    .select("id, is_club_team, federation_team_id")
    .eq("category", category);

  if (teamsError) throw new Error(teamsError.message);

  const categoryTeams = teams ?? [];
  const teamIds = categoryTeams.map((team) => team.id);
  let matchesRemoved = 0;
  let teamsRemoved = 0;

  if (teamIds.length > 0) {
    const { data: matches, error: matchesError } = await supabase
      .from("matches")
      .select("id")
      .eq("is_federation", true)
      .or(`home_team_id.in.(${teamIds.join(",")}),away_team_id.in.(${teamIds.join(",")})`);

    if (matchesError) throw new Error(matchesError.message);

    for (const match of matches ?? []) {
      const { count, error: countError } = await supabase
        .from("match_events")
        .select("id", { count: "exact", head: true })
        .eq("match_id", match.id);
      if (countError) throw new Error(countError.message);
      if ((count ?? 0) > 0) continue;

      const { error } = await supabase.from("matches").delete().eq("id", match.id);
      if (error) throw new Error(error.message);
      matchesRemoved += 1;
    }
  }

  const opponents = categoryTeams.filter(
    (team) => !team.is_club_team && Boolean(team.federation_team_id)
  );

  for (const team of opponents) {
    const { count, error: countError } = await supabase
      .from("matches")
      .select("id", { count: "exact", head: true })
      .or(`home_team_id.eq.${team.id},away_team_id.eq.${team.id}`);
    if (countError) throw new Error(countError.message);
    if ((count ?? 0) > 0) continue;

    const { error } = await supabase.from("teams").delete().eq("id", team.id);
    if (error) throw new Error(error.message);
    teamsRemoved += 1;
  }

  return { teamsRemoved, matchesRemoved };
}

async function upsertFederationTeam(
  supabase: SupabaseClient,
  team: FmvTeam,
  category: TeamCategory
) {
  const { data: byFed } = await supabase
    .from("teams")
    .select("id, logo_url, is_club_team")
    .eq("federation_team_id", team.id)
    .maybeSingle();
  if (byFed) {
    await refreshFederationTeam(supabase, byFed.id, team, byFed.is_club_team, byFed.logo_url);
    return "exists";
  }

  if (isClubTeamName(team.name)) {
    const { data: club } = await supabase
      .from("teams")
      .select("id, federation_team_id, logo_url, is_club_team")
      .eq("is_club_team", true)
      .eq("category", category)
      .maybeSingle();
    if (club) {
      await refreshFederationTeam(supabase, club.id, team, true, club.logo_url);
      return club.federation_team_id ? "exists" : "linked";
    }
  }

  const { data: sameName } = await supabase
    .from("teams")
    .select("id, federation_team_id, logo_url, is_club_team")
    .eq("category", category)
    .eq("is_one_off", false)
    .ilike("name", team.name)
    .maybeSingle();
  if (sameName) {
    await refreshFederationTeam(
      supabase,
      sameName.id,
      team,
      sameName.is_club_team,
      sameName.logo_url
    );
    return sameName.federation_team_id ? "exists" : "linked";
  }

  const { error } = await supabase.from("teams").insert({
    name: team.name,
    short_name: team.shortName || team.name.slice(0, 8),
    category,
    is_club_team: isClubTeamName(team.name),
    federation_team_id: team.id,
    logo_url: team.logoUrl || null,
    city: "Madrid",
  });
  if (error) throw new Error(error.message);
  return "created";
}

async function refreshFederationTeam(
  supabase: SupabaseClient,
  teamId: string,
  team: FmvTeam,
  isClubTeam: boolean,
  currentLogo: string | null
) {
  const patch: {
    federation_team_id: string;
    name?: string;
    logo_url?: string;
  } = { federation_team_id: team.id };

  if (!isClubTeam) {
    patch.name = team.name;
    if (team.logoUrl) patch.logo_url = team.logoUrl;
  } else if (!currentLogo && team.logoUrl) {
    patch.logo_url = team.logoUrl;
  }

  const { error } = await supabase.from("teams").update(patch).eq("id", teamId);
  if (error) throw new Error(error.message);
}

async function loadMatchesByFederationId(supabase: SupabaseClient, federationIds: string[]) {
  const existing = new Map<string, { id: string; notes: string | null }>();
  const ids = federationIds.filter(Boolean);
  for (let index = 0; index < ids.length; index += 80) {
    const chunk = ids.slice(index, index + 80);
    const { data, error } = await supabase
      .from("matches")
      .select("id, federation_match_id, notes")
      .in("federation_match_id", chunk);
    if (error) throw new Error(error.message);
    for (const match of data ?? []) {
      if (!match.federation_match_id) continue;
      existing.set(match.federation_match_id, { id: match.id, notes: match.notes });
    }
  }
  return existing;
}

async function updateExistingFederationMatch(
  supabase: SupabaseClient,
  existing: { id: string; notes: string | null },
  match: FmvMatch
): Promise<"matchesUpdated" | "matchesSkipped"> {
  const { count, error: countError } = await supabase
    .from("match_events")
    .select("id", { count: "exact", head: true })
    .eq("match_id", existing.id);
  if (countError) throw new Error(countError.message);
  if ((count ?? 0) > 0) return "matchesSkipped";

  const scores =
    match.finished && match.setScores.length > 0
      ? matchScoreFromSets(match.setScores, "finished")
      : match.finished && match.homeSets != null && match.awaySets != null
        ? {
            home_sets: match.homeSets,
            away_sets: match.awaySets,
            set_scores: match.setScores,
            current_set: Math.max(1, match.homeSets + match.awaySets),
            home_points: 0,
            away_points: 0,
            status: "finished" as const,
          }
        : {};

  const { error } = await supabase
    .from("matches")
    .update({
      scheduled_at: match.scheduledAt,
      location: match.location || null,
      federation_round: match.round,
      is_federation: true,
      notes: federationNotesForSchedule(match.schedulePrecision, existing.notes),
      ...scores,
    })
    .eq("id", existing.id);
  if (error) throw new Error(error.message);
  if ((scores as { status?: string }).status === "finished") {
    await supabase.rpc("game_resolve_match_predictions", { p_match_id: existing.id });
  }
  return "matchesUpdated";
}

async function removeRivalsOutsideGroup(
  supabase: SupabaseClient,
  category: TeamCategory,
  groupTeamIds: Set<string>
) {
  const { data: stored, error } = await supabase
    .from("teams")
    .select("id, name, federation_team_id, is_club_team")
    .eq("category", category)
    .limit(1000);
  if (error) throw new Error(error.message);

  const extras = (stored ?? []).filter(
    (team) =>
      !team.is_club_team &&
      Boolean(team.federation_team_id) &&
      !groupTeamIds.has(team.federation_team_id as string)
  );
  if (extras.length === 0) return { teamsRemoved: 0, matchesRemoved: 0, errors: [] as string[] };

  const extraIds = extras.map((team) => team.id);
  const [{ data: homeMatches, error: homeError }, { data: awayMatches, error: awayError }] =
    await Promise.all([
      supabase.from("matches").select("id, home_team_id, away_team_id").in("home_team_id", extraIds),
      supabase.from("matches").select("id, home_team_id, away_team_id").in("away_team_id", extraIds),
    ]);
  if (homeError) throw new Error(homeError.message);
  if (awayError) throw new Error(awayError.message);

  const matches = new Map<string, { id: string; home_team_id: string; away_team_id: string }>();
  for (const match of [...(homeMatches ?? []), ...(awayMatches ?? [])]) {
    matches.set(match.id, match);
  }
  const matchIds = [...matches.keys()];

  const [players, playingProfiles, coachedProfiles] = await Promise.all([
    supabase.from("players").select("team_id").in("team_id", extraIds),
    supabase.from("profiles").select("team_id").in("team_id", extraIds),
    supabase.from("profiles").select("coached_team_id").in("coached_team_id", extraIds),
  ]);
  if (players.error) throw new Error(players.error.message);
  if (playingProfiles.error) throw new Error(playingProfiles.error.message);
  if (coachedProfiles.error) throw new Error(coachedProfiles.error.message);

  const eventMatchIds = new Set<string>();
  const predictionMatchIds = new Set<string>();
  for (let index = 0; index < matchIds.length; index += 80) {
    const chunk = matchIds.slice(index, index + 80);
    const [{ data, error: eventsError }, { data: predictions, error: predictionsError }] =
      await Promise.all([
        supabase.from("match_events").select("match_id").in("match_id", chunk),
        supabase.from("match_predictions").select("match_id").in("match_id", chunk).limit(2000),
      ]);
    if (eventsError) throw new Error(eventsError.message);
    if (predictionsError) throw new Error(predictionsError.message);
    for (const row of data ?? []) eventMatchIds.add(row.match_id);
    for (const row of predictions ?? []) predictionMatchIds.add(row.match_id);
  }

  const blocked = new Set<string>();
  for (const row of players.data ?? []) if (row.team_id) blocked.add(row.team_id);
  for (const row of playingProfiles.data ?? []) if (row.team_id) blocked.add(row.team_id);
  for (const row of coachedProfiles.data ?? []) {
    if (row.coached_team_id) blocked.add(row.coached_team_id);
  }
  for (const match of matches.values()) {
    if (!eventMatchIds.has(match.id) && !predictionMatchIds.has(match.id)) continue;
    if (extraIds.includes(match.home_team_id)) blocked.add(match.home_team_id);
    if (extraIds.includes(match.away_team_id)) blocked.add(match.away_team_id);
  }

  const removable = new Set(extraIds.filter((id) => !blocked.has(id)));
  const errors = extras
    .filter((team) => blocked.has(team.id))
    .map((team) => `${team.name} se queda: tiene jugadores, usuarios, estadísticas o pronósticos.`);

  let matchesRemoved = 0;
  const deleteMatchIds = [...matches.values()]
    .filter(
      (match) =>
        !eventMatchIds.has(match.id) &&
        !predictionMatchIds.has(match.id) &&
        (removable.has(match.home_team_id) || removable.has(match.away_team_id))
    )
    .map((match) => match.id);

  for (let index = 0; index < deleteMatchIds.length; index += 80) {
    const chunk = deleteMatchIds.slice(index, index + 80);
    const { error: deleteError, count } = await supabase
      .from("matches")
      .delete({ count: "exact" })
      .in("id", chunk);
    if (deleteError) throw new Error(deleteError.message);
    matchesRemoved += count ?? chunk.length;
  }

  let teamsRemoved = 0;
  const removableIds = [...removable];
  for (let index = 0; index < removableIds.length; index += 80) {
    const chunk = removableIds.slice(index, index + 80);
    const { error: deleteError, count } = await supabase
      .from("teams")
      .delete({ count: "exact" })
      .in("id", chunk);
    if (deleteError) throw new Error(deleteError.message);
    teamsRemoved += count ?? chunk.length;
  }

  return { teamsRemoved, matchesRemoved, errors };
}

async function upsertFederationMatch(
  supabase: SupabaseClient,
  match: FmvMatch,
  category: TeamCategory
): Promise<"matchesCreated" | "matchesUpdated" | "matchesSkipped"> {
  const home = await findTeam(supabase, match.homeId, match.homeName, category);
  const away = await findTeam(supabase, match.awayId, match.awayName, category);
  if (!home || !away) return "matchesSkipped";

  const { data: existing } = await supabase
    .from("matches")
    .select("id, status, notes")
    .eq("federation_match_id", match.id)
    .maybeSingle();

  const scores =
    match.finished && match.setScores.length > 0
      ? matchScoreFromSets(match.setScores, "finished")
      : match.finished && match.homeSets != null && match.awaySets != null
        ? {
            home_sets: match.homeSets,
            away_sets: match.awaySets,
            set_scores: match.setScores,
            current_set: Math.max(1, match.homeSets + match.awaySets),
            home_points: 0,
            away_points: 0,
            status: "finished" as const,
          }
        : {};

  if (existing) {
    const { count } = await supabase
      .from("match_events")
      .select("id", { count: "exact", head: true })
      .eq("match_id", existing.id);
    if ((count ?? 0) > 0) return "matchesSkipped";

    const { error } = await supabase
      .from("matches")
      .update({
        scheduled_at: match.scheduledAt,
        location: match.location || null,
        federation_round: match.round,
        is_federation: true,
        notes: federationNotesForSchedule(match.schedulePrecision, existing.notes),
        ...scores,
      })
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
    if ((scores as { status?: string }).status === "finished") {
      await supabase.rpc("game_resolve_match_predictions", { p_match_id: existing.id });
    }
    return "matchesUpdated";
  }

  const { error } = await supabase.from("matches").insert({
    home_team_id: home.id,
    away_team_id: away.id,
    scheduled_at: match.scheduledAt,
    location: match.location || null,
    is_federation: true,
    federation_match_id: match.id,
    federation_round: match.round,
    notes: federationNotesForSchedule(match.schedulePrecision),
    ...scores,
  });
  if (error) throw new Error(error.message);
  return "matchesCreated";
}

async function findTeam(
  supabase: SupabaseClient,
  federationId: string,
  name: string,
  category: TeamCategory
) {
  if (federationId) {
    const { data } = await supabase
      .from("teams")
      .select("id")
      .eq("federation_team_id", federationId)
      .maybeSingle();
    if (data) return data as Pick<Team, "id">;
  }
  const { data } = await supabase
    .from("teams")
    .select("id")
    .eq("category", category)
    .eq("is_one_off", false)
    .ilike("name", name)
    .maybeSingle();
  return (data as Pick<Team, "id"> | null) ?? null;
}
