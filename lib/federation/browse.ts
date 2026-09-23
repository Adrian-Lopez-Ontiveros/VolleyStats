import {
  fetchFmvCompetitionTypes,
  fetchFmvCompetitions,
  fetchFmvDivisions,
  fetchFmvGroupInfo,
  fetchFmvGroupOptions,
  fetchFmvMatches,
  fetchFmvPhases,
  foldFmvText,
  type FmvMatch,
} from "@/lib/federation/client";
import type { FmvSchedulePrecision } from "@/lib/federation/schedule";

export type FmvCompetitionHit = {
  id: string;
  name: string;
  typeName: string;
};

export type FmvGroupHit = {
  groupId: string;
  label: string;
};

export type FmvBrowseMatch = {
  id: string;
  scheduledAt: string;
  location: string;
  round: string;
  status: "live" | "scheduled" | "finished";
  homeSets: number;
  awaySets: number;
  setScores: { home: number; away: number }[];
  schedulePrecision: FmvSchedulePrecision;
  homeName: string;
  awayName: string;
  homeId: string;
  awayId: string;
};

export type FmvLeagueSnapshot = {
  groupId: string;
  title: string;
  matches: FmvBrowseMatch[];
};

const CATALOG_TTL_MS = 30 * 60 * 1000;

let competitionCache: { at: number; items: FmvCompetitionHit[] } | null = null;
const groupCache = new Map<string, { at: number; items: FmvGroupHit[] }>();

function tokensOf(query: string) {
  return foldFmvText(query)
    .split(" ")
    .filter((token) => token.length >= 2);
}

async function loadCompetitions() {
  if (competitionCache && Date.now() - competitionCache.at < CATALOG_TTL_MS) {
    return competitionCache.items;
  }

  const types = await fetchFmvCompetitionTypes();
  const lists = await Promise.all(
    types.map(async (type) => {
      const competitions = await fetchFmvCompetitions(type.id);
      return competitions.map((item) => ({
        id: item.id,
        name: item.name.trim(),
        typeName: type.name,
      }));
    })
  );
  const items = lists.flat();
  competitionCache = { at: Date.now(), items };
  return items;
}

async function mapPool<T, R>(items: T[], limit: number, mapper: (item: T) => Promise<R>) {
  const results: R[] = [];
  for (let index = 0; index < items.length; index += limit) {
    const chunk = items.slice(index, index + limit);
    results.push(...(await Promise.all(chunk.map(mapper))));
  }
  return results;
}

export async function searchFmvCompetitions(query: string): Promise<FmvCompetitionHit[]> {
  const tokens = tokensOf(query);
  if (tokens.length === 0) return [];

  const items = await loadCompetitions();
  const ranked = items
    .map((item) => {
      const haystack = foldFmvText(`${item.typeName} ${item.name}`);
      const score = tokens.reduce((sum, token) => sum + (haystack.includes(token) ? 1 : 0), 0);
      return { item, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name, "es"));
  const best = ranked[0]?.score ?? 0;
  return ranked
    .filter((entry) => entry.score === best)
    .slice(0, 12)
    .map((entry) => entry.item);
}

export function groupFilterFromQuery(query: string, competitionName: string) {
  const competition = foldFmvText(competitionName);
  return tokensOf(query)
    .filter((token) => !competition.includes(token))
    .join(" ");
}

export async function listFmvLeagueGroups(competitionId: string): Promise<FmvGroupHit[]> {
  const cached = groupCache.get(competitionId);
  if (cached && Date.now() - cached.at < CATALOG_TTL_MS) return cached.items;

  const divisions = await fetchFmvDivisions(competitionId);
  const phases = (
    await mapPool(divisions, 4, async (division) => {
      const divisionPhases = await fetchFmvPhases(division.id);
      return divisionPhases.map((phase) => ({ division, phase }));
    })
  ).flat();

  const groups = (
    await mapPool(phases, 6, async ({ division, phase }) => {
      const options = await fetchFmvGroupOptions(phase.id);
      return options.map((group) => ({
        groupId: group.id,
        label: [division.name, phase.name, group.name].filter(Boolean).join(" · "),
      }));
    })
  ).flat();

  groups.sort((a, b) => a.label.localeCompare(b.label, "es"));
  groupCache.set(competitionId, { at: Date.now(), items: groups });
  return groups;
}

function browseStatus(match: FmvMatch, now: number): FmvBrowseMatch["status"] {
  if (match.finished) return "finished";
  if (match.schedulePrecision === "exact") {
    const start = new Date(match.scheduledAt).getTime();
    if (Number.isFinite(start) && now >= start && now - start < 2.5 * 60 * 60 * 1000) {
      return "live";
    }
  }
  return "scheduled";
}

export async function loadFmvLeague(groupId: string): Promise<FmvLeagueSnapshot> {
  const now = Date.now();
  const [info, matches] = await Promise.all([
    fetchFmvGroupInfo(groupId),
    fetchFmvMatches(groupId, { scores: true }),
  ]);

  const title =
    [info.typeName, info.competition, info.division, info.phase, info.name]
      .filter(Boolean)
      .join(" · ") ||
    info.path ||
    info.name;

  return {
    groupId,
    title,
    matches: matches.map((match) => ({
      id: match.id,
      scheduledAt: match.scheduledAt,
      location: match.location,
      round: match.round,
      status: browseStatus(match, now),
      homeSets: match.homeSets ?? 0,
      awaySets: match.awaySets ?? 0,
      setScores: match.setScores,
      schedulePrecision: match.schedulePrecision,
      homeName: match.homeName,
      awayName: match.awayName,
      homeId: match.homeId,
      awayId: match.awayId,
    })),
  };
}
