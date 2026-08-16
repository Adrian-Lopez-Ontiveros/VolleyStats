import { format } from "date-fns";
import { es } from "date-fns/locale";
import { totalPlayerPoints } from "@/lib/volleyball";
import type { Match, Player, PlayerStats, PointType, SetScore, Team } from "@/lib/types";

export type StandingRow = {
  position: number;
  team: Pick<Team, "id" | "name" | "short_name" | "logo_url" | "city">;
  played: number;
  won: number;
  lost: number;
  setsFor: number;
  setsAgainst: number;
  pointsFor: number;
  pointsAgainst: number;
  setDiff: number;
  pointDiff: number;
  leaguePoints: number;
};

export type PlayerMatchSample = {
  matchId: string;
  date: string;
  label: string;
  points: number;
  errors: number;
  attacks: number;
  blocks: number;
  aces: number;
  opponentErrors: number;
  other: number;
  efficiency: number;
};

export type MatchStandingInput = Pick<
  Match,
  "home_team_id" | "away_team_id" | "status" | "home_sets" | "away_sets" | "set_scores"
>;

export function normalizeSetScores(value: unknown): SetScore[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is SetScore =>
      !!item &&
      typeof item === "object" &&
      typeof (item as SetScore).home === "number" &&
      typeof (item as SetScore).away === "number"
  );
}

export function rallyPointsFromSets(setScores: unknown) {
  return normalizeSetScores(setScores).reduce(
    (acc, set) => {
      acc.home += set.home;
      acc.away += set.away;
      return acc;
    },
    { home: 0, away: 0 }
  );
}

/** Puntos de liga RFEVB / FIVB: 3-0 o 3-1 → 3, 3-2 → 2, 2-3 → 1, resto → 0. */
export function leaguePointsForResult(setsWon: number, setsLost: number) {
  if (setsWon > setsLost) return setsLost <= 1 ? 3 : 2;
  if (setsWon < setsLost) return setsWon >= 2 ? 1 : 0;
  return 0;
}

export function computeStandings(
  teams: StandingRow["team"][],
  matches: MatchStandingInput[]
): StandingRow[] {
  const rows = new Map<string, StandingRow>();

  for (const team of teams) {
    rows.set(team.id, {
      position: 0,
      team,
      played: 0,
      won: 0,
      lost: 0,
      setsFor: 0,
      setsAgainst: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      setDiff: 0,
      pointDiff: 0,
      leaguePoints: 0,
    });
  }

  for (const match of matches) {
    if (match.status !== "finished") continue;
    const home = rows.get(match.home_team_id);
    const away = rows.get(match.away_team_id);
    if (!home || !away) continue;

    const rally = rallyPointsFromSets(match.set_scores);
    const homeSets = match.home_sets;
    const awaySets = match.away_sets;

    home.played += 1;
    away.played += 1;
    home.setsFor += homeSets;
    home.setsAgainst += awaySets;
    away.setsFor += awaySets;
    away.setsAgainst += homeSets;
    home.pointsFor += rally.home;
    home.pointsAgainst += rally.away;
    away.pointsFor += rally.away;
    away.pointsAgainst += rally.home;

    if (homeSets > awaySets) {
      home.won += 1;
      away.lost += 1;
    } else if (awaySets > homeSets) {
      away.won += 1;
      home.lost += 1;
    }

    home.leaguePoints += leaguePointsForResult(homeSets, awaySets);
    away.leaguePoints += leaguePointsForResult(awaySets, homeSets);
  }

  for (const row of rows.values()) {
    row.setDiff = row.setsFor - row.setsAgainst;
    row.pointDiff = row.pointsFor - row.pointsAgainst;
  }

  const ranked = [...rows.values()].sort((a, b) => {
    if (b.leaguePoints !== a.leaguePoints) return b.leaguePoints - a.leaguePoints;
    if (b.won !== a.won) return b.won - a.won;
    if (b.setDiff !== a.setDiff) return b.setDiff - a.setDiff;
    const aSetRatio = a.setsAgainst === 0 ? a.setsFor : a.setsFor / Math.max(a.setsAgainst, 1);
    const bSetRatio = b.setsAgainst === 0 ? b.setsFor : b.setsFor / Math.max(b.setsAgainst, 1);
    if (bSetRatio !== aSetRatio) return bSetRatio - aSetRatio;
    if (b.pointDiff !== a.pointDiff) return b.pointDiff - a.pointDiff;
    return a.team.name.localeCompare(b.team.name, "es");
  });

  ranked.forEach((row, index) => {
    row.position = index + 1;
  });

  return ranked;
}

export function scoringPoints(stats: Pick<PlayerStats, "attack_points" | "block_points" | "aces" | "other_points">) {
  return totalPlayerPoints(stats);
}

/** Eficiencia simplificada: (puntos − errores) / (puntos + errores). Rango −100 a 100. */
export function playerEfficiencyPercent(points: number, errors: number) {
  const denom = points + errors;
  if (denom === 0) return 0;
  return ((points - errors) / denom) * 100;
}

export function playerEfficiencyFromStats(stats: PlayerStats) {
  return playerEfficiencyPercent(scoringPoints(stats), stats.errors);
}

export function formatSigned(value: number) {
  if (value > 0) return `+${value}`;
  return String(value);
}

export function formatEfficiency(value: number) {
  const rounded = Math.round(value);
  return `${rounded > 0 ? "+" : ""}${rounded}%`;
}

export function emptyPlayerSample(matchId: string, date: string): PlayerMatchSample {
  return {
    matchId,
    date,
    label: formatMatchLabel(date),
    points: 0,
    errors: 0,
    attacks: 0,
    blocks: 0,
    aces: 0,
    opponentErrors: 0,
    other: 0,
    efficiency: 0,
  };
}

export function applyPointType(sample: PlayerMatchSample, pointType: PointType) {
  switch (pointType) {
    case "attack":
      sample.attacks += 1;
      sample.points += 1;
      break;
    case "block":
      sample.blocks += 1;
      sample.points += 1;
      break;
    case "ace":
      sample.aces += 1;
      sample.points += 1;
      break;
    case "other":
      sample.other += 1;
      sample.points += 1;
      break;
    case "error":
      sample.errors += 1;
      break;
    case "opponent_error":
      sample.opponentErrors += 1;
      break;
  }
  sample.efficiency = playerEfficiencyPercent(sample.points, sample.errors);
}

export function formatMatchLabel(isoDate: string) {
  try {
    return format(new Date(isoDate), "d MMM", { locale: es });
  } catch {
    return isoDate;
  }
}

export function buildPlayerMatchSeries(
  events: {
    match_id: string;
    point_type: PointType;
    created_at: string;
    match?: { scheduled_at?: string | null; status?: string | null } | null;
  }[]
): PlayerMatchSample[] {
  const byMatch = new Map<string, PlayerMatchSample>();

  for (const event of events) {
    const date = event.match?.scheduled_at || event.created_at;
    let sample = byMatch.get(event.match_id);
    if (!sample) {
      sample = emptyPlayerSample(event.match_id, date);
      byMatch.set(event.match_id, sample);
    }
    applyPointType(sample, event.point_type);
  }

  return [...byMatch.values()].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
}

export function summarizePlayerSeries(series: PlayerMatchSample[]) {
  const totals = series.reduce(
    (acc, item) => {
      acc.points += item.points;
      acc.errors += item.errors;
      acc.attacks += item.attacks;
      acc.blocks += item.blocks;
      acc.aces += item.aces;
      acc.opponentErrors += item.opponentErrors;
      acc.other += item.other;
      return acc;
    },
    { points: 0, errors: 0, attacks: 0, blocks: 0, aces: 0, opponentErrors: 0, other: 0 }
  );

  return {
    ...totals,
    matches: series.length,
    efficiency: playerEfficiencyPercent(totals.points, totals.errors),
  };
}

export type RankedPlayer = Player & {
  points: number;
  efficiency: number;
  series: PlayerMatchSample[];
};

export function rankPlayers(
  players: Player[],
  seriesByPlayer: Map<string, PlayerMatchSample[]>
): RankedPlayer[] {
  return [...players]
    .map((player) => ({
      ...player,
      points: scoringPoints(player),
      efficiency: playerEfficiencyFromStats(player),
      series: seriesByPlayer.get(player.id) ?? [],
    }))
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.efficiency !== a.efficiency) return b.efficiency - a.efficiency;
      return a.full_name.localeCompare(b.full_name, "es");
    });
}

export type TeamMatchSample = {
  matchId: string;
  date: string;
  label: string;
  opponent: string;
  pointsFor: number;
  pointsAgainst: number;
  won: boolean;
  setsFor: number;
  setsAgainst: number;
};

export function buildTeamMatchSeries(
  teamId: string,
  matches: (MatchStandingInput & {
    id: string;
    scheduled_at: string;
    home_team?: { name?: string; short_name?: string | null } | null;
    away_team?: { name?: string; short_name?: string | null } | null;
  })[]
): TeamMatchSample[] {
  return matches
    .filter((match) => match.status === "finished")
    .sort(
      (a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
    )
    .map((match) => {
      const isHome = match.home_team_id === teamId;
      const opponentTeam = isHome ? match.away_team : match.home_team;
      const rally = rallyPointsFromSets(match.set_scores);
      const setsFor = isHome ? match.home_sets : match.away_sets;
      const setsAgainst = isHome ? match.away_sets : match.home_sets;
      return {
        matchId: match.id,
        date: match.scheduled_at,
        label: formatMatchLabel(match.scheduled_at),
        opponent: opponentTeam?.short_name || opponentTeam?.name || "Rival",
        pointsFor: isHome ? rally.home : rally.away,
        pointsAgainst: isHome ? rally.away : rally.home,
        won: setsFor > setsAgainst,
        setsFor,
        setsAgainst,
      };
    });
}

export function summarizeTeamSeries(series: TeamMatchSample[]) {
  const played = series.length;
  const won = series.filter((item) => item.won).length;
  const pointsFor = series.reduce((sum, item) => sum + item.pointsFor, 0);
  const pointsAgainst = series.reduce((sum, item) => sum + item.pointsAgainst, 0);
  return {
    played,
    won,
    lost: played - won,
    pointsFor,
    pointsAgainst,
    pointDiff: pointsFor - pointsAgainst,
    winRate: played === 0 ? 0 : (won / played) * 100,
  };
}

export type PointTypeCounts = Record<PointType, number>;

export function emptyPointTypeCounts(): PointTypeCounts {
  return {
    attack: 0,
    block: 0,
    ace: 0,
    error: 0,
    opponent_error: 0,
    other: 0,
  };
}

export function countPointTypes(
  events: { point_type: PointType }[]
): PointTypeCounts {
  const counts = emptyPointTypeCounts();
  for (const event of events) {
    counts[event.point_type] += 1;
  }
  return counts;
}

export type MatchScorer = {
  playerId: string;
  name: string;
  jersey: number | null;
  points: number;
  errors: number;
};

export function topMatchScorers(
  events: {
    player_id: string | null;
    point_type: PointType;
    player?: { id: string; full_name: string; jersey_number: number | null } | null;
  }[],
  limit = 5
): MatchScorer[] {
  const byPlayer = new Map<string, MatchScorer>();

  for (const event of events) {
    if (!event.player_id || !event.player) continue;
    let row = byPlayer.get(event.player_id);
    if (!row) {
      row = {
        playerId: event.player_id,
        name: event.player.full_name,
        jersey: event.player.jersey_number,
        points: 0,
        errors: 0,
      };
      byPlayer.set(event.player_id, row);
    }
    if (event.point_type === "error") row.errors += 1;
    else if (event.point_type !== "opponent_error") row.points += 1;
  }

  return [...byPlayer.values()]
    .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name, "es"))
    .slice(0, limit);
}
