import { fetchFmvGroupInfo, fetchFmvMatches, type FmvMatch } from "@/lib/federation/client";
import type { FmvSchedulePrecision } from "@/lib/federation/schedule";

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
