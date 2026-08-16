import { isOwnErrorType, isScoringAction, scoresForActingTeam } from "@/lib/volleyball";
import {
  attackStatsFromEvents,
  formatAttackEfficiency,
  formatSkillRate,
  possessionStatsFromEvents,
  rotationStatsForTeam,
  serveStatsFromEvents,
  type RotationRow,
} from "@/lib/volleyball-stats";
import type { MatchEventWithPlayer, MatchWithTeams, PointType } from "@/lib/types";

export type BoxScorePlayer = {
  playerId: string;
  name: string;
  jersey: number | null;
  points: number;
  errors: number;
  kills: number;
  attackErrors: number;
  attackAttempts: number;
  attackEfficiency: number | null;
  aces: number;
  serveErrors: number;
};

export type BoxScoreHighlight = {
  label: string;
  value: string;
  detail: string;
};

export type BoxScoreModel = {
  match: MatchWithTeams;
  homeLabel: string;
  awayLabel: string;
  clubTeamId: string | null;
  clubLabel: string;
  players: BoxScorePlayer[];
  highlights: BoxScoreHighlight[];
  costlyErrors: BoxScorePlayer[];
  homeRotations: RotationRow[];
  awayRotations: RotationRow[];
  clubRotations: RotationRow[];
};

function playerName(
  player: { full_name: string; jersey_number: number | null } | null | undefined,
  fallback: string
) {
  if (!player) return fallback;
  return player.full_name;
}

export function buildMatchPlayerLines(events: MatchEventWithPlayer[]): BoxScorePlayer[] {
  const byPlayer = new Map<string, { line: BoxScorePlayer; types: PointType[] }>();

  for (const event of events) {
    if (!event.player_id || !event.player) continue;
    let row = byPlayer.get(event.player_id);
    if (!row) {
      row = {
        line: {
          playerId: event.player_id,
          name: playerName(event.player, "Jugador"),
          jersey: event.player.jersey_number,
          points: 0,
          errors: 0,
          kills: 0,
          attackErrors: 0,
          attackAttempts: 0,
          attackEfficiency: null,
          aces: 0,
          serveErrors: 0,
        },
        types: [],
      };
      byPlayer.set(event.player_id, row);
    }
    row.types.push(event.point_type);
    if (isOwnErrorType(event.point_type)) row.line.errors += 1;
    else if (isScoringAction(event.point_type) && scoresForActingTeam(event.point_type)) {
      row.line.points += 1;
    }
    if (event.point_type === "attack") row.line.kills += 1;
    if (event.point_type === "attack_error") row.line.attackErrors += 1;
    if (
      event.point_type === "attack" ||
      event.point_type === "attack_error" ||
      event.point_type === "attack_continuation"
    ) {
      row.line.attackAttempts += 1;
    }
    if (event.point_type === "ace") row.line.aces += 1;
    if (event.point_type === "serve_error") row.line.serveErrors += 1;
  }

  return [...byPlayer.values()]
    .map(({ line, types }) => ({
      ...line,
      attackEfficiency: attackStatsFromEvents(types.map((point_type) => ({ point_type }))).efficiency,
    }))
    .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name, "es"));
}

export function buildBoxScore(
  match: MatchWithTeams,
  events: MatchEventWithPlayer[]
): BoxScoreModel {
  const homeLabel = match.home_team.short_name || match.home_team.name;
  const awayLabel = match.away_team.short_name || match.away_team.name;
  const clubTeamId = match.home_team.is_club_team
    ? match.home_team_id
    : match.away_team.is_club_team
      ? match.away_team_id
      : match.home_team_id;
  const clubLabel =
    clubTeamId === match.home_team_id ? homeLabel : awayLabel;

  const players = buildMatchPlayerLines(events);
  const possession = possessionStatsFromEvents(events, match.home_team_id, match.away_team_id);
  const clubSide = clubTeamId === match.home_team_id ? possession.home : possession.away;
  const clubEvents = events.filter((event) => event.acting_team_id === clubTeamId);
  const clubAttack = attackStatsFromEvents(clubEvents);
  const clubServe = serveStatsFromEvents(clubEvents);
  const homeRotations = rotationStatsForTeam(
    events,
    match.home_team_id,
    match.home_team_id,
    match.away_team_id
  );
  const awayRotations = rotationStatsForTeam(
    events,
    match.away_team_id,
    match.home_team_id,
    match.away_team_id
  );
  const clubRotations = clubTeamId === match.home_team_id ? homeRotations : awayRotations;

  const topScorer = players[0] ?? null;
  const bestAttack = [...players]
    .filter((player) => (player.attackAttempts ?? 0) >= 3)
    .sort((a, b) => (b.attackEfficiency ?? -2) - (a.attackEfficiency ?? -2))[0] ?? null;
  const costlyErrors = [...players]
    .filter((player) => player.errors > 0)
    .sort((a, b) => b.errors - a.errors)
    .slice(0, 3);

  const highlights: BoxScoreHighlight[] = [];
  if (topScorer) {
    highlights.push({
      label: "Más puntos",
      value: `${topScorer.points}`,
      detail: topScorer.name,
    });
  }
  if (bestAttack) {
    highlights.push({
      label: "Mejor ataque",
      value: formatAttackEfficiency(bestAttack.attackEfficiency),
      detail: `${bestAttack.name} · ${bestAttack.kills}/${bestAttack.attackAttempts}`,
    });
  }
  highlights.push({
    label: "Side-out",
    value: formatSkillRate(clubSide.sideOut.rate),
    detail: clubLabel,
  });
  highlights.push({
    label: "Break-point",
    value: formatSkillRate(clubSide.breakPoint.rate),
    detail: clubLabel,
  });
  highlights.push({
    label: "Eff. ataque",
    value: formatAttackEfficiency(clubAttack.efficiency),
    detail: clubAttack.attempts
      ? `${clubAttack.kills} kills · ${clubAttack.errors} err`
      : clubLabel,
  });
  highlights.push({
    label: "Saque",
    value: formatSkillRate(clubServe.successRate),
    detail: `${clubServe.aces} aces · ${clubServe.errors} err`,
  });

  return {
    match,
    homeLabel,
    awayLabel,
    clubTeamId,
    clubLabel,
    players,
    highlights,
    costlyErrors,
    homeRotations,
    awayRotations,
    clubRotations,
  };
}
