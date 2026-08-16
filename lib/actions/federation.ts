"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  applyActaToMatch,
  fetchFmvActa,
  fetchFmvGroups,
  fetchFmvMatches,
  fetchFmvTeams,
  type FmvMatch,
  type FmvTeam,
} from "@/lib/federation/client";
import { isClubTeamName, matchFederationLeague } from "@/lib/federation/leagues";
import { matchScoreFromSets } from "@/lib/match-result";
import type { TeamCategory } from "@/lib/categories";
import type { Team } from "@/lib/types";

export type FederationSyncReport = {
  groups: number;
  teamsCreated: number;
  teamsLinked: number;
  matchesCreated: number;
  matchesUpdated: number;
  matchesSkipped: number;
  errors: string[];
};

export async function syncFederationLeagues(): Promise<
  FederationSyncReport | { error: string }
> {
  await requireAdmin();

  const report: FederationSyncReport = {
    groups: 0,
    teamsCreated: 0,
    teamsLinked: 0,
    matchesCreated: 0,
    matchesUpdated: 0,
    matchesSkipped: 0,
    errors: [],
  };

  try {
    const groups = await fetchFmvGroups();
    const relevant = groups.filter((group) =>
      matchFederationLeague(`${group.competition} ${group.name}`)
    );
    report.groups = relevant.length;

    for (const group of relevant) {
      const category = matchFederationLeague(`${group.competition} ${group.name}`);
      if (!category) continue;
      try {
        const teams = await fetchFmvTeams(group.id);
        for (const team of teams) {
          const result = await upsertFederationTeam(team, category);
          if (result === "created") report.teamsCreated += 1;
          if (result === "linked") report.teamsLinked += 1;
        }

        const matches = await fetchFmvMatches(group.id);
        for (const raw of matches) {
          let match = raw;
          if (raw.finished || (raw.homeSets ?? 0) + (raw.awaySets ?? 0) > 0) {
            match = applyActaToMatch(raw, await fetchFmvActa(raw.id));
          }
          const result = await upsertFederationMatch(match, category);
          report[result] += 1;
        }
      } catch (error) {
        report.errors.push(
          `${group.name}: ${error instanceof Error ? error.message : "error de sincronización"}`
        );
      }
    }
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "No se pudo leer la API de la Federación de Madrid.",
    };
  }

  revalidatePath("/partidos");
  revalidatePath("/liga");
  revalidatePath("/equipos");
  revalidatePath("/admin");
  return report;
}

async function upsertFederationTeam(team: FmvTeam, category: TeamCategory) {
  const supabase = await createClient();
  const { data: byFed } = await supabase
    .from("teams")
    .select("id")
    .eq("federation_team_id", team.id)
    .maybeSingle();
  if (byFed) return "exists";

  if (isClubTeamName(team.name)) {
    const { data: club } = await supabase
      .from("teams")
      .select("id, federation_team_id")
      .eq("is_club_team", true)
      .eq("category", category)
      .maybeSingle();
    if (club) {
      if (!club.federation_team_id) {
        await supabase
          .from("teams")
          .update({ federation_team_id: team.id })
          .eq("id", club.id);
        return "linked";
      }
      return "exists";
    }
  }

  const { data: sameName } = await supabase
    .from("teams")
    .select("id, federation_team_id")
    .eq("category", category)
    .ilike("name", team.name)
    .maybeSingle();
  if (sameName) {
    if (!sameName.federation_team_id) {
      await supabase
        .from("teams")
        .update({ federation_team_id: team.id })
        .eq("id", sameName.id);
      return "linked";
    }
    return "exists";
  }

  const { error } = await supabase.from("teams").insert({
    name: team.name,
    short_name: team.shortName || team.name.slice(0, 8),
    category,
    is_club_team: isClubTeamName(team.name),
    federation_team_id: team.id,
    city: "Madrid",
  });
  if (error) throw new Error(error.message);
  return "created";
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
