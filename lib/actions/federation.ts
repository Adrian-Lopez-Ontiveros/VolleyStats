"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { TEAM_CATEGORIES, type TeamCategory } from "@/lib/categories";
import { createClient } from "@/lib/supabase/server";
import {
  FMV_TEST_LEAGUE,
  fetchFmvCompetitionTypes,
  fetchFmvCompetitions,
  fetchFmvDivisions,
  fetchFmvGroupInfo,
  fetchFmvGroupOptions,
  fetchFmvMatches,
  fetchFmvPhases,
  fetchFmvTeams,
  resolveFmvTestLeague,
  type FmvCatalogPath,
  type FmvMatch,
  type FmvOption,
  type FmvTeam,
} from "@/lib/federation/client";
import { inferCategoryFromFmv, isClubTeamName } from "@/lib/federation/leagues";
import { matchScoreFromSets } from "@/lib/match-result";
import type { Team } from "@/lib/types";

export type FederationSyncReport = {
  groups: number;
  groupName: string;
  teamsCreated: number;
  teamsLinked: number;
  matchesCreated: number;
  matchesUpdated: number;
  matchesSkipped: number;
  errors: string[];
};

export type FmvTestLeagueResult = FmvCatalogPath & {
  label: string;
  category: TeamCategory;
};

function emptyReport(groupName = ""): FederationSyncReport {
  return {
    groups: 0,
    groupName,
    teamsCreated: 0,
    teamsLinked: 0,
    matchesCreated: 0,
    matchesUpdated: 0,
    matchesSkipped: 0,
    errors: [],
  };
}

export async function listFmvCompetitionTypes(): Promise<FmvOption[] | { error: string }> {
  await requireAdmin();
  try {
    return await fetchFmvCompetitionTypes();
  } catch (error) {
    return { error: fmvError(error) };
  }
}

export async function listFmvCompetitions(
  typeId: string
): Promise<FmvOption[] | { error: string }> {
  await requireAdmin();
  if (!typeId) return [];
  try {
    return await fetchFmvCompetitions(typeId);
  } catch (error) {
    return { error: fmvError(error) };
  }
}

export async function listFmvDivisions(
  competitionId: string
): Promise<FmvOption[] | { error: string }> {
  await requireAdmin();
  if (!competitionId) return [];
  try {
    return await fetchFmvDivisions(competitionId);
  } catch (error) {
    return { error: fmvError(error) };
  }
}

export async function listFmvPhases(
  divisionId: string
): Promise<FmvOption[] | { error: string }> {
  await requireAdmin();
  if (!divisionId) return [];
  try {
    return await fetchFmvPhases(divisionId);
  } catch (error) {
    return { error: fmvError(error) };
  }
}

export async function listFmvGroups(phaseId: string): Promise<FmvOption[] | { error: string }> {
  await requireAdmin();
  if (!phaseId) return [];
  try {
    return await fetchFmvGroupOptions(phaseId);
  } catch (error) {
    return { error: fmvError(error) };
  }
}

export async function getFmvTestLeague(): Promise<FmvTestLeagueResult | { error: string }> {
  await requireAdmin();
  try {
    const path = await resolveFmvTestLeague();
    const category =
      inferCategoryFromFmv(
        `${path.competitionName} ${path.divisionName} ${path.phaseName} ${path.groupName}`
      ) ?? "cadete_femenino";
    return {
      ...path,
      label: FMV_TEST_LEAGUE.label,
      category,
    };
  } catch (error) {
    return { error: fmvError(error) };
  }
}

export async function syncFederationGroup(
  groupId: string,
  category: TeamCategory
): Promise<FederationSyncReport | { error: string }> {
  await requireAdmin();

  if (!groupId) return { error: "Selecciona un grupo de la federación." };
  if (!TEAM_CATEGORIES.some((item) => item.id === category)) {
    return { error: "La liga de destino no es válida." };
  }

  const report = emptyReport();

  try {
    const group = await fetchFmvGroupInfo(groupId);
    report.groups = 1;
    report.groupName = group.path;

    const teams = await fetchFmvTeams(group.id);
    for (const team of teams) {
      const result = await upsertFederationTeam(team, category);
      if (result === "created") report.teamsCreated += 1;
      if (result === "linked") report.teamsLinked += 1;
    }

    const matches = await fetchFmvMatches(group.id);
    for (const match of matches) {
      const result = await upsertFederationMatch(match, category);
      report[result] += 1;
    }
  } catch (error) {
    return { error: fmvError(error) };
  }

  revalidatePath("/partidos");
  revalidatePath("/liga");
  revalidatePath("/equipos");
  revalidatePath("/admin");
  return report;
}

export async function syncFederationLeagues(): Promise<
  FederationSyncReport | { error: string }
> {
  const test = await getFmvTestLeague();
  if ("error" in test) return test;
  return syncFederationGroup(test.groupId, test.category);
}

async function upsertFederationTeam(team: FmvTeam, category: TeamCategory) {
  const supabase = await createClient();
  const { data: byFed } = await supabase
    .from("teams")
    .select("id, logo_url, is_club_team")
    .eq("federation_team_id", team.id)
    .maybeSingle();
  if (byFed) {
    await refreshFederationTeam(byFed.id, team, byFed.is_club_team, byFed.logo_url);
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
      await refreshFederationTeam(club.id, team, true, club.logo_url);
      return club.federation_team_id ? "exists" : "linked";
    }
  }

  const { data: sameName } = await supabase
    .from("teams")
    .select("id, federation_team_id, logo_url, is_club_team")
    .eq("category", category)
    .ilike("name", team.name)
    .maybeSingle();
  if (sameName) {
    await refreshFederationTeam(sameName.id, team, sameName.is_club_team, sameName.logo_url);
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
  teamId: string,
  team: FmvTeam,
  isClubTeam: boolean,
  currentLogo: string | null
) {
  const supabase = await createClient();
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
  match: FmvMatch,
  category: TeamCategory
): Promise<"matchesCreated" | "matchesUpdated" | "matchesSkipped"> {
  const supabase = await createClient();
  const home = await findTeam(match.homeId, match.homeName, category);
  const away = await findTeam(match.awayId, match.awayName, category);
  if (!home || !away) return "matchesSkipped";

  const { data: existing } = await supabase
    .from("matches")
    .select("id, status")
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
        ...scores,
      })
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
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
    ...scores,
  });
  if (error) throw new Error(error.message);
  return "matchesCreated";
}

async function findTeam(federationId: string, name: string, category: TeamCategory) {
  const supabase = await createClient();
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
    .ilike("name", name)
    .maybeSingle();
  return (data as Pick<Team, "id"> | null) ?? null;
}

function fmvError(error: unknown) {
  return error instanceof Error
    ? error.message
    : "No se pudo leer la API de la Federación de Madrid.";
}
