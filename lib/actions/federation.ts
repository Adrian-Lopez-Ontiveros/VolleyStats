"use server";

import { requireAdmin } from "@/lib/auth";
import { TEAM_CATEGORIES, type TeamCategory } from "@/lib/categories";
import { createClient } from "@/lib/supabase/server";
import {
  FMV_TEST_LEAGUE,
  fetchFmvCompetitionTypes,
  fetchFmvCompetitions,
  fetchFmvDivisions,
  fetchFmvGroupOptions,
  fetchFmvPhases,
  resolveFmvTestLeague,
  type FmvCatalogPath,
  type FmvOption,
} from "@/lib/federation/client";
import { inferCategoryFromFmv } from "@/lib/federation/leagues";
import { importFederationGroup, type FederationSyncReport } from "@/lib/federation/sync";

export type { FederationSyncReport };

export type FmvTestLeagueResult = FmvCatalogPath & {
  label: string;
  category: TeamCategory;
};

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

  try {
    const supabase = await createClient();
    return await importFederationGroup(supabase, groupId, category, { wipe: true });
  } catch (error) {
    return { error: fmvError(error) };
  }
}

function fmvError(error: unknown) {
  return error instanceof Error
    ? error.message
    : "No se pudo leer la API de la Federación de Madrid.";
}
