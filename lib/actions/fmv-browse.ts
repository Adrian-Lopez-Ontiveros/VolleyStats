"use server";

import { requireViewer } from "@/lib/auth";
import {
  groupFilterFromQuery,
  listFmvLeagueGroups,
  loadFmvLeague,
  searchFmvCompetitions,
  type FmvCompetitionHit,
  type FmvGroupHit,
  type FmvLeagueSnapshot,
} from "@/lib/federation/browse";

function fmvError(error: unknown) {
  return error instanceof Error
    ? error.message
    : "No se pudo leer la API de la Federación de Madrid.";
}

export async function browseFmvCompetitions(
  query: string
): Promise<{ competitions: FmvCompetitionHit[] } | { error: string }> {
  await requireViewer();
  const trimmed = query.trim();
  if (trimmed.length < 2) {
    return { error: "Escribe al menos 2 letras, por ejemplo Cadete o Senior." };
  }

  try {
    const competitions = await searchFmvCompetitions(trimmed);
    return { competitions };
  } catch (error) {
    return { error: fmvError(error) };
  }
}

export async function browseFmvGroups(
  competitionId: string,
  query: string,
  competitionName: string
): Promise<{ groups: FmvGroupHit[]; groupFilter: string } | { error: string }> {
  await requireViewer();
  if (!competitionId) return { error: "Elige una competición." };

  try {
    const groups = await listFmvLeagueGroups(competitionId);
    return {
      groups,
      groupFilter: groupFilterFromQuery(query, competitionName),
    };
  } catch (error) {
    return { error: fmvError(error) };
  }
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
