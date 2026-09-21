import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { TEAM_CATEGORIES, type TeamCategory } from "@/lib/categories";
import {
  fetchFmvGroupInfo,
  fetchFmvMatches,
  fetchFmvTeams,
  resolveClubFmvGroups,
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
  options?: { wipe?: boolean }
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

  const matches = await fetchFmvMatches(group.id);
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

export async function runScheduledFederationSync(
  supabase: SupabaseClient,
  kind: ScheduledFederationSyncKind
) {
  const groups = await resolveClubFmvGroups();
  if (groups.length === 0) {
    return {
      kind,
      synced: [] as FederationSyncReport[],
      errors: ["No se encontraron grupos de FMV con un equipo de Fuenlabrada."],
    };
  }

  const settled = await Promise.allSettled(
    groups.map((group) => importFederationGroup(supabase, group.groupId, group.category))
  );

  const synced: FederationSyncReport[] = [];
  const errors: string[] = [];

  settled.forEach((result, index) => {
    const group = groups[index];
    if (result.status === "fulfilled") {
      result.value.groupName = group.path;
      synced.push(result.value);
      return;
    }
    const reason = result.reason;
    errors.push(`${group.path}: ${reason instanceof Error ? reason.message : "Error FMV"}`);
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
