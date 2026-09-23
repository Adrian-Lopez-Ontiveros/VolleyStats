"use server";

import { requireViewer } from "@/lib/auth";
import {
  fetchFmvCompetitionTypes,
  fetchFmvCompetitions,
  fetchFmvDivisions,
  fetchFmvGroupOptions,
  fetchFmvPhases,
  type FmvOption,
} from "@/lib/federation/client";
import { loadFmvLeague, type FmvLeagueSnapshot } from "@/lib/federation/browse";

function fmvError(error: unknown) {
  return error instanceof Error
    ? error.message
    : "No se pudo leer la API de la Federación de Madrid.";
}

async function loadOptions(
  loader: () => Promise<FmvOption[]>
): Promise<FmvOption[] | { error: string }> {
  await requireViewer();
  try {
    return await loader();
  } catch (error) {
    return { error: fmvError(error) };
  }
}

export async function browseFmvTypes(): Promise<FmvOption[] | { error: string }> {
  return loadOptions(() => fetchFmvCompetitionTypes());
}

export async function browseFmvCompetitionsForType(
  typeId: string
): Promise<FmvOption[] | { error: string }> {
  if (!typeId) return [];
  return loadOptions(() => fetchFmvCompetitions(typeId));
}

export async function browseFmvDivisionsForCompetition(
  competitionId: string
): Promise<FmvOption[] | { error: string }> {
  if (!competitionId) return [];
  return loadOptions(() => fetchFmvDivisions(competitionId));
}

export async function browseFmvPhasesForDivision(
  divisionId: string
): Promise<FmvOption[] | { error: string }> {
  if (!divisionId) return [];
  return loadOptions(() => fetchFmvPhases(divisionId));
}

export async function browseFmvGroupsForPhase(
  phaseId: string
): Promise<FmvOption[] | { error: string }> {
  if (!phaseId) return [];
  return loadOptions(() => fetchFmvGroupOptions(phaseId));
}

export async function browseFmvLeague(
  groupId: string
): Promise<FmvLeagueSnapshot | { error: string }> {
  await requireViewer();
  if (!groupId) return { error: "Elige un grupo." };

  try {
    return await loadFmvLeague(groupId);
  } catch (error) {
    return { error: fmvError(error) };
  }
}
