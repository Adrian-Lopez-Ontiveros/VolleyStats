import type { PointType } from "@/lib/types";
import { isOwnErrorType } from "@/lib/volleyball";

export type AttackStats = {
  kills: number;
  errors: number;
  continuations: number;
  attempts: number;
  efficiency: number | null;
};

export type ServeStats = {
  aces: number;
  errors: number;
  inPlay: number;
  attempts: number;
  successRate: number | null;
};

export type ReceptionStats = {
  good: number;
  medium: number;
  bad: number;
  errors: number;
  total: number;
  goodRate: number | null;
  successRate: number | null;
};

export type DefenseStats = {
  good: number;
  medium: number;
  bad: number;
  errors: number;
  total: number;
  goodRate: number | null;
  successRate: number | null;
};

export type PossessionStats = {
  opportunities: number;
  won: number;
  rate: number | null;
};

export type TeamPossessionStats = {
  sideOut: PossessionStats;
  breakPoint: PossessionStats;
};

export type SetPossessionStats = {
  setNumber: number;
  home: TeamPossessionStats;
  away: TeamPossessionStats;
};

type SkillEvent = {
  point_type: PointType;
  acting_team_id?: string | null;
  scoring_team_id?: string | null;
  serving_team_id?: string | null;
  home_rotation?: number | null;
  away_rotation?: number | null;
  set_number?: number | null;
  created_at?: string;
  match_id?: string;
};

function rate(won: number, total: number): number | null {
  if (total === 0) return null;
  return won / total;
}

export function emptyAttackStats(): AttackStats {
  return { kills: 0, errors: 0, continuations: 0, attempts: 0, efficiency: null };
}

export function emptyPossessionStats(): PossessionStats {
  return { opportunities: 0, won: 0, rate: null };
}

export function attackStatsFromEvents(events: SkillEvent[]): AttackStats {
  let kills = 0;
  let errors = 0;
  let continuations = 0;
  for (const event of events) {
    if (event.point_type === "attack") kills += 1;
    else if (event.point_type === "attack_error") errors += 1;
    else if (event.point_type === "attack_continuation") continuations += 1;
  }
  const attempts = kills + errors + continuations;
  return {
    kills,
    errors,
    continuations,
    attempts,
    efficiency: attempts === 0 ? null : (kills + continuations) / attempts,
  };
}

export function serveStatsFromEvents(events: SkillEvent[]): ServeStats {
  let aces = 0;
  let errors = 0;
  let inPlay = 0;
  for (const event of events) {
    if (event.point_type === "ace") aces += 1;
    else if (event.point_type === "serve_error") errors += 1;
    else if (event.point_type === "serve_in") inPlay += 1;
  }
  const attempts = aces + errors + inPlay;
  return {
    aces,
    errors,
    inPlay,
    attempts,
    successRate: rate(aces + inPlay, attempts),
  };
}

export function receptionStatsFromEvents(events: SkillEvent[]): ReceptionStats {
  let good = 0;
  let medium = 0;
  let bad = 0;
  let errors = 0;
  for (const event of events) {
    if (event.point_type === "reception_good") good += 1;
    else if (event.point_type === "reception_medium") medium += 1;
    else if (event.point_type === "reception_bad") bad += 1;
    else if (event.point_type === "reception_error") errors += 1;
  }
  const total = good + medium + bad + errors;
  return {
    good,
    medium,
    bad,
    errors,
    total,
    goodRate: rate(good, total),
    successRate: rate(good + medium + bad, total),
  };
}

export function emptyDefenseStats(): DefenseStats {
  return {
    good: 0,
    medium: 0,
    bad: 0,
    errors: 0,
    total: 0,
    goodRate: null,
    successRate: null,
  };
}

export function emptyReceptionStats(): ReceptionStats {
  return {
    good: 0,
    medium: 0,
    bad: 0,
    errors: 0,
    total: 0,
    goodRate: null,
    successRate: null,
  };
}

export function defenseStatsFromEvents(events: SkillEvent[]): DefenseStats {
  let good = 0;
  let medium = 0;
  let bad = 0;
  let errors = 0;
  for (const event of events) {
    if (event.point_type === "defense_good") good += 1;
    else if (event.point_type === "defense_medium") medium += 1;
    else if (event.point_type === "defense_bad") bad += 1;
    else if (event.point_type === "defense_error") errors += 1;
  }
  const total = good + medium + bad + errors;
  return {
    good,
    medium,
    bad,
    errors,
    total,
    goodRate: rate(good, total),
    successRate: rate(good + medium + bad, total),
  };
}

export function formatSkillRate(value: number | null) {
  if (value === null) return "—";
  return `${Math.round(value * 100)}%`;
}

export function formatAttackEfficiency(value: number | null) {
  return formatSkillRate(value);
}

function emptyTeamPossession(): TeamPossessionStats {
  return {
    sideOut: emptyPossessionStats(),
    breakPoint: emptyPossessionStats(),
  };
}

function finalizePossession(stats: PossessionStats) {
  stats.rate = rate(stats.won, stats.opportunities);
  return stats;
}

export function inferNextServer(
  events: SkillEvent[],
  homeTeamId: string,
  awayTeamId: string,
  currentSet: number
) {
  const scoring = [...events]
    .filter((event) => event.scoring_team_id)
    .sort(
      (a, b) =>
        new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime()
    );

  const lastInSet = [...scoring].reverse().find((event) => event.set_number === currentSet);
  if (lastInSet?.scoring_team_id) return lastInSet.scoring_team_id;

  return currentSet % 2 === 1 ? homeTeamId : awayTeamId;
}

function withInferredServe(
  events: SkillEvent[],
  homeTeamId: string,
  awayTeamId: string
) {
  const scoring = [...events]
    .filter((event) => event.scoring_team_id)
    .sort(
      (a, b) =>
        new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime()
    );

  let lastSet = 0;
  let nextServer: string | null = null;

  return scoring.map((event) => {
    if (event.set_number && event.set_number !== lastSet) {
      lastSet = event.set_number;
      nextServer =
        event.serving_team_id ??
        (event.set_number % 2 === 1 ? homeTeamId : awayTeamId);
    }

    const servingTeamId = event.serving_team_id ?? nextServer;
    nextServer = event.scoring_team_id ?? nextServer;
    return { ...event, servingTeamId };
  });
}

export function possessionStatsFromEvents(
  events: SkillEvent[],
  homeTeamId: string,
  awayTeamId: string
): { home: TeamPossessionStats; away: TeamPossessionStats; bySet: SetPossessionStats[] } {
  const annotated = withInferredServe(events, homeTeamId, awayTeamId);
  const home = emptyTeamPossession();
  const away = emptyTeamPossession();
  const bySet = new Map<number, SetPossessionStats>();

  function bucket(setNumber: number, teamId: string) {
    let row = bySet.get(setNumber);
    if (!row) {
      row = { setNumber, home: emptyTeamPossession(), away: emptyTeamPossession() };
      bySet.set(setNumber, row);
    }
    return teamId === homeTeamId ? row.home : row.away;
  }

  function apply(target: TeamPossessionStats, servingTeamId: string, scoringTeamId: string, teamId: string) {
    const receiving = servingTeamId !== teamId;
    const won = scoringTeamId === teamId;
    if (receiving) {
      target.sideOut.opportunities += 1;
      if (won) target.sideOut.won += 1;
    } else {
      target.breakPoint.opportunities += 1;
      if (won) target.breakPoint.won += 1;
    }
  }

  for (const event of annotated) {
    if (!event.servingTeamId || !event.scoring_team_id) continue;
    apply(home, event.servingTeamId, event.scoring_team_id, homeTeamId);
    apply(away, event.servingTeamId, event.scoring_team_id, awayTeamId);
    if (event.set_number) {
      apply(bucket(event.set_number, homeTeamId), event.servingTeamId, event.scoring_team_id, homeTeamId);
      apply(bucket(event.set_number, awayTeamId), event.servingTeamId, event.scoring_team_id, awayTeamId);
    }
  }

  const finalizeTeam = (team: TeamPossessionStats) => {
    finalizePossession(team.sideOut);
    finalizePossession(team.breakPoint);
    return team;
  };

  return {
    home: finalizeTeam(home),
    away: finalizeTeam(away),
    bySet: [...bySet.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([, row]) => ({
        setNumber: row.setNumber,
        home: finalizeTeam(row.home),
        away: finalizeTeam(row.away),
      })),
  };
}

/**
 * Orden en el que se mueve la colocadora al ganar el saque: 1 → 6 → 5 → 4 → 3 → 2.
 * La rotación que se muestra es la zona en la que está ella, no un contador que empiece siempre en 1.
 * En base de datos se guarda el paso desde la alineación inicial (1 = sin rotar).
 */
export const ROTATION_PLAY_ORDER = [1, 6, 5, 4, 3, 2] as const;

export type SetterStarts = {
  homeSetterStart?: number | null;
  awaySetterStart?: number | null;
};

export function nextRotation(rotation: number) {
  const index = ROTATION_PLAY_ORDER.indexOf(rotation as (typeof ROTATION_PLAY_ORDER)[number]);
  if (index < 0) return 1;
  return ROTATION_PLAY_ORDER[(index + 1) % ROTATION_PLAY_ORDER.length];
}

export function stepsBetweenZones(from: number, to: number) {
  if (!isRotation(from) || !isRotation(to)) return 0;
  const start = ROTATION_PLAY_ORDER.indexOf(from as (typeof ROTATION_PLAY_ORDER)[number]);
  const end = ROTATION_PLAY_ORDER.indexOf(to as (typeof ROTATION_PLAY_ORDER)[number]);
  if (start < 0 || end < 0) return 0;
  return (end - start + ROTATION_PLAY_ORDER.length) % ROTATION_PLAY_ORDER.length;
}

export function zoneAfterSteps(start: number, steps: number) {
  if (!isRotation(start)) return 1;
  const index = ROTATION_PLAY_ORDER.indexOf(start as (typeof ROTATION_PLAY_ORDER)[number]);
  if (index < 0) return 1;
  const offset = ((steps % ROTATION_PLAY_ORDER.length) + ROTATION_PLAY_ORDER.length) % ROTATION_PLAY_ORDER.length;
  return ROTATION_PLAY_ORDER[(index + offset) % ROTATION_PLAY_ORDER.length];
}

function anchorZone(setterStart: number | null | undefined) {
  return isRotation(setterStart) ? setterStart : 1;
}

export function zoneFromStoredRotation(
  stored: number | null | undefined,
  setterStart?: number | null
) {
  const start = anchorZone(setterStart);
  if (!isRotation(stored)) return start;
  return zoneAfterSteps(start, stored - 1);
}

export function storedRotationFromZone(zone: number | null | undefined, setterStart?: number | null) {
  const start = anchorZone(setterStart);
  if (!isRotation(zone)) return null;
  return stepsBetweenZones(start, zone) + 1;
}

export function isRotation(value: number | null | undefined): value is number {
  return typeof value === "number" && value >= 1 && value <= 6;
}

export function inferNextRotations(
  events: SkillEvent[],
  homeTeamId: string,
  awayTeamId: string,
  currentSet: number,
  setterStarts?: SetterStarts
) {
  const scoring = [...events]
    .filter((event) => event.scoring_team_id)
    .sort(
      (a, b) =>
        new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime()
    );

  const lastInSet = [...scoring].reverse().find((event) => event.set_number === currentSet);
  if (!lastInSet) {
    return {
      home: anchorZone(setterStarts?.homeSetterStart),
      away: anchorZone(setterStarts?.awaySetterStart),
    };
  }

  let home = zoneFromStoredRotation(lastInSet.home_rotation, setterStarts?.homeSetterStart);
  let away = zoneFromStoredRotation(lastInSet.away_rotation, setterStarts?.awaySetterStart);

  if (
    lastInSet.scoring_team_id &&
    lastInSet.serving_team_id &&
    lastInSet.scoring_team_id !== lastInSet.serving_team_id
  ) {
    if (lastInSet.scoring_team_id === homeTeamId) home = nextRotation(home);
    if (lastInSet.scoring_team_id === awayTeamId) away = nextRotation(away);
  }

  return { home, away };
}

export type RotationRow = {
  rotation: number;
  pointsFor: number;
  pointsAgainst: number;
  errors: number;
  attack: AttackStats;
  sideOut: PossessionStats;
  breakPoint: PossessionStats;
};

function emptyRotationRow(rotation: number): RotationRow {
  return {
    rotation,
    pointsFor: 0,
    pointsAgainst: 0,
    errors: 0,
    attack: emptyAttackStats(),
    sideOut: emptyPossessionStats(),
    breakPoint: emptyPossessionStats(),
  };
}

function teamRotationOnEvent(
  event: SkillEvent,
  teamId: string,
  homeTeamId: string,
  setterStarts?: SetterStarts
) {
  const value = teamId === homeTeamId ? event.home_rotation : event.away_rotation;
  if (!isRotation(value)) return null;
  const setterStart = teamId === homeTeamId ? setterStarts?.homeSetterStart : setterStarts?.awaySetterStart;
  return zoneFromStoredRotation(value, setterStart);
}

export function rotationStatsForTeam(
  events: SkillEvent[],
  teamId: string,
  homeTeamId: string,
  awayTeamId: string,
  setterStarts?: SetterStarts
): RotationRow[] {
  const annotated = withInferredServe(events, homeTeamId, awayTeamId);
  const rows = new Map<number, RotationRow>();
  const attackEvents = new Map<number, SkillEvent[]>();

  for (let rotation = 1; rotation <= 6; rotation += 1) {
    rows.set(rotation, emptyRotationRow(rotation));
  }

  for (const event of events) {
    const rotation = teamRotationOnEvent(event, teamId, homeTeamId, setterStarts);
    if (!rotation) continue;
    const row = rows.get(rotation);
    if (!row) continue;

    if (event.scoring_team_id === teamId) row.pointsFor += 1;
    else if (event.scoring_team_id) row.pointsAgainst += 1;

    if (event.acting_team_id === teamId) {
      const list = attackEvents.get(rotation) ?? [];
      list.push(event);
      attackEvents.set(rotation, list);
      if (isOwnErrorType(event.point_type)) row.errors += 1;
    }
  }

  for (const event of annotated) {
    const rotation = teamRotationOnEvent(event, teamId, homeTeamId, setterStarts);
    if (!rotation || !event.servingTeamId || !event.scoring_team_id) continue;
    const row = rows.get(rotation);
    if (!row) continue;
    const receiving = event.servingTeamId !== teamId;
    const won = event.scoring_team_id === teamId;
    if (receiving) {
      row.sideOut.opportunities += 1;
      if (won) row.sideOut.won += 1;
    } else {
      row.breakPoint.opportunities += 1;
      if (won) row.breakPoint.won += 1;
    }
  }

  return ROTATION_PLAY_ORDER.map((rotation) => {
    const row = rows.get(rotation) ?? emptyRotationRow(rotation);
    row.attack = attackStatsFromEvents(attackEvents.get(rotation) ?? []);
    finalizePossession(row.sideOut);
    finalizePossession(row.breakPoint);
    return row;
  });
}

export function rotationStatsAcrossMatches(
  matches: ({ id: string; home_team_id: string; away_team_id: string } & SetterStarts)[],
  events: (SkillEvent & { match_id: string })[],
  teamId: string
): RotationRow[] {
  const merged = new Map<number, RotationRow>();
  const attackEvents = new Map<number, SkillEvent[]>();

  for (let rotation = 1; rotation <= 6; rotation += 1) {
    merged.set(rotation, emptyRotationRow(rotation));
  }

  for (const match of matches) {
    const rows = rotationStatsForTeam(
      events.filter((event) => event.match_id === match.id),
      teamId,
      match.home_team_id,
      match.away_team_id,
      {
        homeSetterStart: match.homeSetterStart,
        awaySetterStart: match.awaySetterStart,
      }
    );
    for (const row of rows) {
      const target = merged.get(row.rotation);
      if (!target) continue;
      target.pointsFor += row.pointsFor;
      target.pointsAgainst += row.pointsAgainst;
      target.errors += row.errors;
      target.sideOut.opportunities += row.sideOut.opportunities;
      target.sideOut.won += row.sideOut.won;
      target.breakPoint.opportunities += row.breakPoint.opportunities;
      target.breakPoint.won += row.breakPoint.won;
    }
  }

  for (const event of events) {
    const match = matches.find((item) => item.id === event.match_id);
    if (!match) continue;
    const rotation = teamRotationOnEvent(event, teamId, match.home_team_id, {
      homeSetterStart: match.homeSetterStart,
      awaySetterStart: match.awaySetterStart,
    });
    if (!rotation || event.acting_team_id !== teamId) continue;
    const list = attackEvents.get(rotation) ?? [];
    list.push(event);
    attackEvents.set(rotation, list);
  }

  return ROTATION_PLAY_ORDER.map((rotation) => {
    const row = merged.get(rotation) ?? emptyRotationRow(rotation);
    row.attack = attackStatsFromEvents(attackEvents.get(rotation) ?? []);
    finalizePossession(row.sideOut);
    finalizePossession(row.breakPoint);
    return row;
  });
}

export function bestAndWorstRotations(rows: RotationRow[]) {
  const active = rows.filter(
    (row) => row.pointsFor + row.pointsAgainst + row.attack.attempts + row.errors > 0
  );
  if (active.length === 0) return { best: null, worst: null };

  const score = (row: RotationRow) => {
    const diff = row.pointsFor - row.pointsAgainst;
    const sideOut = row.sideOut.rate ?? 0;
    return diff * 10 + sideOut;
  };

  const ranked = [...active].sort((a, b) => score(b) - score(a));
  return { best: ranked[0], worst: ranked[ranked.length - 1] };
}

export function filterTeamEvents<T extends { acting_team_id?: string | null }>(
  events: T[],
  teamId: string
) {
  return events.filter((event) => event.acting_team_id === teamId);
}

export function possessionStatsForTeam(
  matches: { id: string; home_team_id: string; away_team_id: string }[],
  events: (SkillEvent & { match_id: string })[],
  teamId: string
): TeamPossessionStats {
  const totals = emptyTeamPossession();

  for (const match of matches) {
    const stats = possessionStatsFromEvents(
      events.filter((event) => event.match_id === match.id),
      match.home_team_id,
      match.away_team_id
    );
    const side = teamId === match.home_team_id ? stats.home : stats.away;
    totals.sideOut.opportunities += side.sideOut.opportunities;
    totals.sideOut.won += side.sideOut.won;
    totals.breakPoint.opportunities += side.breakPoint.opportunities;
    totals.breakPoint.won += side.breakPoint.won;
  }

  finalizePossession(totals.sideOut);
  finalizePossession(totals.breakPoint);
  return totals;
}
