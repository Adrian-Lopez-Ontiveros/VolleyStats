import { POINT_TYPE_META, POSITION_LABELS } from "@/lib/constants";
import { getCategoryMeta, isTeamCategory } from "@/lib/categories";
import { formatMatchWhen, stripFmvScheduleNote } from "@/lib/federation/schedule";
import {
  annotateEventScores,
  computeMatchState,
  isOwnErrorType,
  isScoringAction,
  isSetWon,
  scoresForActingTeam,
  setsToWinOf,
} from "@/lib/volleyball";
import {
  attackStatsFromEvents,
  bestAndWorstRotations,
  defenseStatsFromEvents,
  emptyAttackStats,
  emptyDefenseStats,
  emptyReceptionStats,
  filterTeamEvents,
  formatAttackEfficiency,
  formatSkillRate,
  possessionStatsFromEvents,
  receptionStatsFromEvents,
  rotationStatsForTeam,
  serveStatsFromEvents,
  type AttackStats,
  type DefenseStats,
  type ReceptionStats,
  type RotationRow,
  type ServeStats,
  type TeamPossessionStats,
} from "@/lib/volleyball-stats";
import type {
  MatchEventWithPlayer,
  MatchWithTeams,
  PlayerPosition,
  PointType,
} from "@/lib/types";

export type MatchExcelRosterPlayer = {
  id: string;
  full_name: string;
  jersey_number: number | null;
  position: PlayerPosition | null;
  team_id: string | null;
};

export type PointOrigins = {
  attack: number;
  block: number;
  ace: number;
  opponentError: number;
  other: number;
};

export type TeamSkillTotals = {
  setPoints: number;
  origins: PointOrigins;
  attack: AttackStats;
  serve: ServeStats;
  reception: ReceptionStats;
  defense: DefenseStats;
  receptionAverage: number | null;
  defenseAverage: number | null;
  blockPoints: number;
  blockTouches: number;
  blockContinuations: number;
  ownErrors: number;
  possession: TeamPossessionStats;
};

export type MatchExcelPlayerRow = {
  playerId: string;
  teamId: string;
  jersey: number | null;
  name: string;
  position: PlayerPosition | null;
  positionLabel: string;
  setsPlayed: number;
  points: number;
  errors: number;
  contribution: number;
  attack: AttackStats;
  serve: ServeStats;
  blockPoints: number;
  blockTouches: number;
  blockContinuations: number;
  reception: ReceptionStats;
  receptionAverage: number | null;
  defense: DefenseStats;
  defenseAverage: number | null;
};

export type MatchExcelSetRow = {
  setNumber: number;
  home: number;
  away: number;
  winner: "home" | "away" | null;
  homeSkills: TeamSkillTotals;
  awaySkills: TeamSkillTotals;
};

export type MatchExcelActionRow = {
  time: string;
  setNumber: number;
  player: string;
  team: string;
  action: string;
  scoringTeam: string;
  homeScore: number;
  awayScore: number;
  scoresPoint: boolean;
};

export type MatchExcelGlossaryRow = {
  term: string;
  meaning: string;
};

export type MatchExcelReport = {
  title: string;
  dateLabel: string;
  location: string | null;
  categoryLabel: string | null;
  round: string | null;
  notes: string | null;
  status: MatchWithTeams["status"];
  resultLabel: "GANADO" | "PERDIDO" | "EN JUEGO" | "PRÓXIMO" | "CANCELADO";
  homeLabel: string;
  awayLabel: string;
  homeName: string;
  awayName: string;
  clubTeamId: string;
  clubLabel: string;
  opponentLabel: string;
  clubIsHome: boolean;
  homeSets: number;
  awaySets: number;
  setScores: { home: number; away: number }[];
  narrative: string[];
  insights: string[];
  highlights: { label: string; value: string; detail: string }[];
  home: TeamSkillTotals;
  away: TeamSkillTotals;
  homePlayers: MatchExcelPlayerRow[];
  awayPlayers: MatchExcelPlayerRow[];
  homeRotations: RotationRow[];
  awayRotations: RotationRow[];
  sets: MatchExcelSetRow[];
  actions: MatchExcelActionRow[];
  glossary: MatchExcelGlossaryRow[];
};

const POSITION_RANK: Record<PlayerPosition, number> = {
  colocador: 0,
  opuesto: 1,
  receptor: 2,
  central: 3,
  universal: 4,
  libero: 5,
};

function emptyServeStats(): ServeStats {
  return { aces: 0, errors: 0, inPlay: 0, attempts: 0, successRate: null };
}

function emptyOrigins(): PointOrigins {
  return { attack: 0, block: 0, ace: 0, opponentError: 0, other: 0 };
}

export function skillQualityAverage(
  stats: Pick<ReceptionStats, "good" | "medium" | "bad" | "errors" | "total">
): number | null {
  if (stats.total === 0) return null;
  return (3 * stats.good + 2 * stats.medium + stats.bad) / stats.total;
}

function originsFromEvents(
  events: Pick<MatchEventWithPlayer, "scoring_team_id" | "acting_team_id" | "point_type">[],
  teamId: string
): PointOrigins {
  const origins = emptyOrigins();
  for (const event of events) {
    if (event.scoring_team_id !== teamId) continue;
    if (event.acting_team_id !== teamId) {
      origins.opponentError += 1;
      continue;
    }
    if (event.point_type === "attack") origins.attack += 1;
    else if (event.point_type === "block") origins.block += 1;
    else if (event.point_type === "ace") origins.ace += 1;
    else if (event.point_type === "opponent_error") origins.opponentError += 1;
    else origins.other += 1;
  }
  return origins;
}

function blockCounts(events: { point_type: PointType }[]) {
  let points = 0;
  let touches = 0;
  let continuations = 0;
  for (const event of events) {
    if (event.point_type === "block") points += 1;
    else if (event.point_type === "block_touch") touches += 1;
    else if (event.point_type === "block_continuation") continuations += 1;
  }
  return { points, touches, continuations };
}

function ownErrorCount(events: { point_type: PointType }[]) {
  return events.filter((event) => isOwnErrorType(event.point_type)).length;
}

function teamSkillsFromEvents(
  events: MatchEventWithPlayer[],
  teamId: string,
  homeTeamId: string,
  awayTeamId: string,
  setPoints: number
): TeamSkillTotals {
  const teamEvents = filterTeamEvents(events, teamId);
  const attack = attackStatsFromEvents(teamEvents);
  const serve = serveStatsFromEvents(teamEvents);
  const reception = receptionStatsFromEvents(teamEvents);
  const defense = defenseStatsFromEvents(teamEvents);
  const blocks = blockCounts(teamEvents);
  const possession = possessionStatsFromEvents(events, homeTeamId, awayTeamId);
  const side = teamId === homeTeamId ? possession.home : possession.away;
  return {
    setPoints,
    origins: originsFromEvents(events, teamId),
    attack,
    serve,
    reception,
    defense,
    receptionAverage: skillQualityAverage(reception),
    defenseAverage: skillQualityAverage(defense),
    blockPoints: blocks.points,
    blockTouches: blocks.touches,
    blockContinuations: blocks.continuations,
    ownErrors: ownErrorCount(teamEvents),
    possession: side,
  };
}

function playerTeamId(
  playerId: string,
  events: MatchEventWithPlayer[],
  rosterById: Map<string, MatchExcelRosterPlayer>
) {
  const fromRoster = rosterById.get(playerId)?.team_id;
  if (fromRoster) return fromRoster;
  const hit = events.find((event) => event.player_id === playerId && event.acting_team_id);
  return hit?.acting_team_id ?? "";
}

function buildPlayerRow(
  playerId: string,
  events: MatchEventWithPlayer[],
  info: MatchExcelRosterPlayer | null,
  teamId: string
): MatchExcelPlayerRow {
  const sample = events.find((event) => event.player_id === playerId)?.player;
  const name = info?.full_name || sample?.full_name || "Jugador";
  const jersey = info?.jersey_number ?? sample?.jersey_number ?? null;
  const position = info?.position ?? sample?.position ?? null;
  const types = events.map((event) => ({ point_type: event.point_type }));
  const attack = attackStatsFromEvents(types);
  const serve = serveStatsFromEvents(types);
  const reception = receptionStatsFromEvents(types);
  const defense = defenseStatsFromEvents(types);
  const blocks = blockCounts(types);
  let points = 0;
  let errors = 0;
  const sets = new Set<number>();
  for (const event of events) {
    sets.add(event.set_number);
    if (isOwnErrorType(event.point_type)) errors += 1;
    else if (isScoringAction(event.point_type) && scoresForActingTeam(event.point_type)) {
      points += 1;
    }
  }
  return {
    playerId,
    teamId,
    jersey,
    name,
    position,
    positionLabel: position ? POSITION_LABELS[position] : "—",
    setsPlayed: sets.size,
    points,
    errors,
    contribution: points - errors,
    attack,
    serve,
    blockPoints: blocks.points,
    blockTouches: blocks.touches,
    blockContinuations: blocks.continuations,
    reception,
    receptionAverage: skillQualityAverage(reception),
    defense,
    defenseAverage: skillQualityAverage(defense),
  };
}

function sortPlayerRows(rows: MatchExcelPlayerRow[]) {
  return [...rows].sort((a, b) => {
    const pa = a.position ? POSITION_RANK[a.position] : 6;
    const pb = b.position ? POSITION_RANK[b.position] : 6;
    if (pa !== pb) return pa - pb;
    const ja = a.jersey ?? 999;
    const jb = b.jersey ?? 999;
    if (ja !== jb) return ja - jb;
    return a.name.localeCompare(b.name, "es");
  });
}

function resultLabel(
  status: MatchWithTeams["status"],
  clubSets: number,
  oppSets: number
): MatchExcelReport["resultLabel"] {
  if (status === "cancelled") return "CANCELADO";
  if (status === "scheduled") return "PRÓXIMO";
  if (status === "live") return "EN JUEGO";
  if (clubSets > oppSets) return "GANADO";
  if (clubSets < oppSets) return "PERDIDO";
  return "EN JUEGO";
}

function formatAvg(value: number | null) {
  if (value === null) return "—";
  return value.toFixed(1).replace(".", ",");
}

function buildNarrative(input: {
  clubLabel: string;
  opponentLabel: string;
  result: MatchExcelReport["resultLabel"];
  clubSets: number;
  oppSets: number;
  setScores: { home: number; away: number }[];
  setsToWin: number;
  clubIsHome: boolean;
  club: TeamSkillTotals;
  opp: TeamSkillTotals;
  players: MatchExcelPlayerRow[];
  rotations: RotationRow[];
}): string[] {
  const lines: string[] = [];
  const score = `${input.clubSets}-${input.oppSets}`;
  if (input.result === "GANADO") {
    lines.push(`${input.clubLabel} ganó ${score} a ${input.opponentLabel}.`);
  } else if (input.result === "PERDIDO") {
    lines.push(`${input.clubLabel} perdió ${score} contra ${input.opponentLabel}.`);
  } else if (input.result === "EN JUEGO") {
    lines.push(`Partido en juego: ${input.clubLabel} ${score} ${input.opponentLabel}.`);
  } else if (input.result === "CANCELADO") {
    lines.push(`El partido contra ${input.opponentLabel} está cancelado.`);
  } else {
    lines.push(`Partido programado: ${input.clubLabel} vs ${input.opponentLabel}.`);
  }

  if (input.setScores.length > 0) {
    const labeled = input.setScores.map((set, index) => {
      const club = input.clubIsHome ? set.home : set.away;
      const opp = input.clubIsHome ? set.away : set.home;
      return { index: index + 1, club, opp, diff: Math.abs(club - opp), won: club > opp };
    });
    const early = labeled.filter((set, index) => {
      const raw = input.setScores[index];
      return !isSetWon(raw.home, raw.away, set.index, input.setsToWin);
    });
    if (early.length > 0) {
      lines.push(
        `El partido se cerró antes de los 25: ${early
          .map((set) => {
            if (set.club === set.opp) {
              return `set ${set.index} ${set.club}-${set.opp} (empate, no se otorga)`;
            }
            const winner = set.won ? input.clubLabel : input.opponentLabel;
            return `set ${set.index} ${set.club}-${set.opp} para ${winner}`;
          })
          .join("; ")}.`
      );
    }
    const closest = [...labeled].sort((a, b) => a.diff - b.diff || a.index - b.index)[0];
    const widest = [...labeled].sort((a, b) => b.diff - a.diff || a.index - b.index)[0];
    if (closest && closest.diff <= 4) {
      lines.push(
        `El set ${closest.index} fue el más igualado (${closest.club}-${closest.opp}).`
      );
    }
    if (widest && widest.diff >= 6 && widest.index !== closest?.index) {
      lines.push(
        `El set ${widest.index} fue el más claro (${widest.club}-${widest.opp}).`
      );
    }
    const extras = labeled.filter((set) => set.club >= 26 || set.opp >= 26);
    if (extras.length > 0) {
      lines.push(
        extras.length === 1
          ? `El set ${extras[0].index} se fue de más (${extras[0].club}-${extras[0].opp}).`
          : `Hubo ${extras.length} sets de más: ${extras
              .map((set) => `set ${set.index} ${set.club}-${set.opp}`)
              .join(", ")}.`
      );
    }
  }

  const scorer = [...input.players].sort(
    (a, b) => b.points - a.points || b.contribution - a.contribution
  )[0];
  if (scorer && scorer.points > 0) {
    lines.push(
      `Máximo anotador: ${scorer.name} (${scorer.points} pts, ${scorer.errors} err, balance ${
        scorer.contribution > 0 ? "+" : ""
      }${scorer.contribution}).`
    );
  }

  if (input.club.attack.attempts > 0) {
    lines.push(
      `Ataque: ${formatAttackEfficiency(input.club.attack.efficiency)} con ${input.club.attack.kills} puntos, ${
        input.club.attack.continuations
      } continuaciones y ${input.club.attack.errors} errores en ${input.club.attack.attempts} intentos.`
    );
  }
  if (input.club.serve.attempts > 0) {
    lines.push(
      `Saque: ${input.club.serve.aces} aces y ${input.club.serve.errors} errores en ${input.club.serve.attempts} saques (${formatSkillRate(
        input.club.serve.successRate
      )} en juego).`
    );
  }
  if (input.club.reception.total > 0) {
    lines.push(
      `Recepción: ${formatSkillRate(input.club.reception.successRate)} sin error (${input.club.reception.good} buenas, ${
        input.club.reception.medium
      } medias, ${input.club.reception.bad} malas, ${input.club.reception.errors} errores). Media ${formatAvg(
        input.club.receptionAverage
      )} sobre 3.`
    );
  }
  if (input.club.defense.total > 0) {
    lines.push(
      `Defensa: ${formatSkillRate(input.club.defense.successRate)} sin error (${input.club.defense.good} buenas, ${
        input.club.defense.medium
      } medias, ${input.club.defense.bad} malas, ${input.club.defense.errors} errores).`
    );
  }
  if (input.club.possession.sideOut.opportunities || input.club.possession.breakPoint.opportunities) {
    lines.push(
      `Puntos recibiendo ${formatSkillRate(input.club.possession.sideOut.rate)} (${input.club.possession.sideOut.won}/${
        input.club.possession.sideOut.opportunities
      }) · con el saque ${formatSkillRate(input.club.possession.breakPoint.rate)} (${input.club.possession.breakPoint.won}/${
        input.club.possession.breakPoint.opportunities
      }).`
    );
  }

  const { best, worst } = bestAndWorstRotations(input.rotations);
  if (best && worst && best.rotation !== worst.rotation) {
    lines.push(
      `Mejor rotación R${best.rotation} (${best.pointsFor}-${best.pointsAgainst}). La más floja, R${worst.rotation} (${worst.pointsFor}-${worst.pointsAgainst}).`
    );
  }

  if (input.club.ownErrors || input.opp.ownErrors) {
    const delta = input.club.ownErrors - input.opp.ownErrors;
    if (delta > 0) {
      lines.push(
        `Se regalaron ${input.club.ownErrors} puntos por error propio, ${delta} más que ${input.opponentLabel}.`
      );
    } else if (delta < 0) {
      lines.push(
        `${input.clubLabel} cometió ${input.club.ownErrors} errores propios, ${-delta} menos que ${input.opponentLabel}.`
      );
    } else {
      lines.push(`Ambos equipos cometieron ${input.club.ownErrors} errores propios.`);
    }
  }

  return lines;
}

function buildInsights(input: {
  clubLabel: string;
  opponentLabel: string;
  club: TeamSkillTotals;
  opp: TeamSkillTotals;
  players: MatchExcelPlayerRow[];
  rotations: RotationRow[];
}): string[] {
  const insights: string[] = [];
  const withAttack = input.players.filter((player) => player.attack.attempts >= 3);
  const bestAttack = [...withAttack].sort(
    (a, b) => (b.attack.efficiency ?? -1) - (a.attack.efficiency ?? -1)
  )[0];
  if (bestAttack) {
    insights.push(
      `Mejor ataque: ${bestAttack.name} ${formatAttackEfficiency(bestAttack.attack.efficiency)} (${bestAttack.attack.kills} pts / ${bestAttack.attack.attempts} int.).`
    );
  }
  const costly = [...input.players].sort((a, b) => b.errors - a.errors)[0];
  if (costly && costly.errors >= 3) {
    insights.push(`${costly.name} acumuló ${costly.errors} errores, los más costosos del equipo.`);
  }
  const serveThreat = [...input.players].sort((a, b) => b.serve.aces - a.serve.aces)[0];
  if (serveThreat && serveThreat.serve.aces >= 2) {
    insights.push(`Saque más productivo: ${serveThreat.name} con ${serveThreat.serve.aces} aces.`);
  }
  if (input.opp.serve.aces >= 3) {
    insights.push(`El saque de ${input.opponentLabel} hizo daño: ${input.opp.serve.aces} aces en contra.`);
  }
  const receiver = [...input.players]
    .filter((player) => player.reception.total >= 4)
    .sort((a, b) => (b.reception.goodRate ?? -1) - (a.reception.goodRate ?? -1))[0];
  if (receiver) {
    insights.push(
      `Mejor recepción: ${receiver.name} ${formatSkillRate(receiver.reception.successRate)} sin error, media ${formatAvg(
        receiver.receptionAverage
      )} (${receiver.reception.good} buenas / ${receiver.reception.total}).`
    );
  }
  const blocker = [...input.players].sort((a, b) => b.blockPoints - a.blockPoints)[0];
  if (blocker && blocker.blockPoints >= 2) {
    insights.push(`Bloqueo: ${blocker.name} aportó ${blocker.blockPoints} puntos de bloqueo.`);
  }
  const { best, worst } = bestAndWorstRotations(input.rotations);
  if (best && worst && best.rotation !== worst.rotation) {
    insights.push(
      `Para el próximo partido: sostener R${best.rotation} y revisar R${worst.rotation} (recibiendo ${formatSkillRate(
        worst.sideOut.rate
      )}).`
    );
  }
  if (input.club.origins.opponentError > input.club.origins.attack && input.club.origins.opponentError >= 8) {
    insights.push(
      `Muchos puntos llegaron por error rival (${input.club.origins.opponentError}) frente a ${input.club.origins.attack} de ataque.`
    );
  }
  return insights.slice(0, 6);
}

function buildHighlights(
  players: MatchExcelPlayerRow[],
  club: TeamSkillTotals,
  clubLabel: string
): { label: string; value: string; detail: string }[] {
  const highlights: { label: string; value: string; detail: string }[] = [];
  const scorer = [...players].sort((a, b) => b.points - a.points)[0];
  if (scorer && scorer.points > 0) {
    highlights.push({ label: "Más puntos", value: String(scorer.points), detail: scorer.name });
  }
  const bestAttack = [...players]
    .filter((player) => player.attack.attempts >= 3)
    .sort((a, b) => (b.attack.efficiency ?? -1) - (a.attack.efficiency ?? -1))[0];
  if (bestAttack) {
    highlights.push({
      label: "Mejor ataque",
      value: formatAttackEfficiency(bestAttack.attack.efficiency),
      detail: `${bestAttack.name} · ${bestAttack.attack.kills}/${bestAttack.attack.attempts}`,
    });
  }
  highlights.push({
    label: "Puntos recibiendo",
    value: formatSkillRate(club.possession.sideOut.rate),
    detail: `${club.possession.sideOut.won} de ${club.possession.sideOut.opportunities} · ${clubLabel}`,
  });
  highlights.push({
    label: "Puntos con el saque",
    value: formatSkillRate(club.possession.breakPoint.rate),
    detail: `${club.possession.breakPoint.won} de ${club.possession.breakPoint.opportunities} · ${clubLabel}`,
  });
  highlights.push({
    label: "Eff. ataque",
    value: formatAttackEfficiency(club.attack.efficiency),
    detail: club.attack.attempts
      ? `${club.attack.kills} pts · ${club.attack.errors} err · ${club.attack.attempts} int.`
      : clubLabel,
  });
  highlights.push({
    label: "Saque",
    value: formatSkillRate(club.serve.successRate),
    detail: `${club.serve.aces} aces · ${club.serve.errors} err`,
  });
  highlights.push({
    label: "Recepción",
    value: formatSkillRate(club.reception.successRate),
    detail: club.reception.total
      ? `${club.reception.good} buenas · media ${formatAvg(club.receptionAverage)}`
      : clubLabel,
  });
  highlights.push({
    label: "Defensa",
    value: formatSkillRate(club.defense.successRate),
    detail: club.defense.total
      ? `${club.defense.good} buenas · ${club.defense.errors} err`
      : clubLabel,
  });
  return highlights;
}

function formatActionTime(iso: string) {
  try {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  } catch {
    return "";
  }
}

export function buildMatchExcelReport(
  match: MatchWithTeams,
  events: MatchEventWithPlayer[],
  roster: MatchExcelRosterPlayer[] = []
): MatchExcelReport {
  const homeLabel = match.home_team.short_name || match.home_team.name;
  const awayLabel = match.away_team.short_name || match.away_team.name;
  const clubIsHome = match.home_team.is_club_team || !match.away_team.is_club_team;
  const clubTeamId = clubIsHome ? match.home_team_id : match.away_team_id;
  const clubLabel = clubIsHome ? homeLabel : awayLabel;
  const opponentLabel = clubIsHome ? awayLabel : homeLabel;
  const computed = computeMatchState(
    events,
    match.home_team_id,
    match.status,
    setsToWinOf(match)
  );
  const setScores =
    match.status === "finished" && computed.setScores.length > 0
      ? computed.setScores
      : match.set_scores ?? [];
  const homeSets = match.status === "finished" ? computed.homeSets : match.home_sets;
  const awaySets = match.status === "finished" ? computed.awaySets : match.away_sets;
  const homeSetPoints = setScores.reduce((sum, set) => sum + set.home, 0);
  const awaySetPoints = setScores.reduce((sum, set) => sum + set.away, 0);
  const home = teamSkillsFromEvents(
    events,
    match.home_team_id,
    match.home_team_id,
    match.away_team_id,
    homeSetPoints
  );
  const away = teamSkillsFromEvents(
    events,
    match.away_team_id,
    match.home_team_id,
    match.away_team_id,
    awaySetPoints
  );
  const club = clubIsHome ? home : away;
  const opp = clubIsHome ? away : home;

  const rosterById = new Map(roster.map((player) => [player.id, player]));
  const playerIds = new Set<string>();
  for (const player of roster) playerIds.add(player.id);
  for (const event of events) {
    if (event.player_id) playerIds.add(event.player_id);
  }

  const eventsByPlayer = new Map<string, MatchEventWithPlayer[]>();
  for (const event of events) {
    if (!event.player_id) continue;
    const list = eventsByPlayer.get(event.player_id) ?? [];
    list.push(event);
    eventsByPlayer.set(event.player_id, list);
  }

  const homePlayers: MatchExcelPlayerRow[] = [];
  const awayPlayers: MatchExcelPlayerRow[] = [];
  for (const playerId of playerIds) {
    const teamId = playerTeamId(playerId, events, rosterById);
    if (teamId !== match.home_team_id && teamId !== match.away_team_id) continue;
    const row = buildPlayerRow(
      playerId,
      eventsByPlayer.get(playerId) ?? [],
      rosterById.get(playerId) ?? null,
      teamId
    );
    if (teamId === match.home_team_id) homePlayers.push(row);
    else awayPlayers.push(row);
  }

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
  const clubPlayers = sortPlayerRows(clubIsHome ? homePlayers : awayPlayers);
  const clubRotations = clubIsHome ? homeRotations : awayRotations;
  const result = resultLabel(
    match.status,
    clubIsHome ? homeSets : awaySets,
    clubIsHome ? awaySets : homeSets
  );

  const sets: MatchExcelSetRow[] = setScores.map((set, index) => {
    const setNumber = index + 1;
    const setEvents = events.filter((event) => event.set_number === setNumber);
    return {
      setNumber,
      home: set.home,
      away: set.away,
      winner: set.home === set.away ? null : set.home > set.away ? "home" : "away",
      homeSkills: teamSkillsFromEvents(
        setEvents,
        match.home_team_id,
        match.home_team_id,
        match.away_team_id,
        set.home
      ),
      awaySkills: teamSkillsFromEvents(
        setEvents,
        match.away_team_id,
        match.home_team_id,
        match.away_team_id,
        set.away
      ),
    };
  });

  const actions: MatchExcelActionRow[] = annotateEventScores(events, match.home_team_id).map(
    (event) => ({
      time: formatActionTime(event.created_at),
      setNumber: event.set_number,
      player: event.player?.full_name
        ? event.player.jersey_number != null
          ? `#${event.player.jersey_number} ${event.player.full_name}`
          : event.player.full_name
        : "",
      team:
        event.acting_team_id === match.home_team_id
          ? homeLabel
          : event.acting_team_id === match.away_team_id
            ? awayLabel
            : "",
      action: POINT_TYPE_META[event.point_type]?.label ?? event.point_type,
      scoringTeam:
        event.scoring_team_id === match.home_team_id
          ? homeLabel
          : event.scoring_team_id === match.away_team_id
            ? awayLabel
            : "",
      homeScore: event.homeScore,
      awayScore: event.awayScore,
      scoresPoint: Boolean(event.scoring_team_id),
    })
  );

  const categoryLabel = isTeamCategory(match.home_team.category)
    ? getCategoryMeta(match.home_team.category).label
    : isTeamCategory(match.away_team.category)
      ? getCategoryMeta(match.away_team.category).label
      : null;

  return {
    title: `${match.home_team.name} vs ${match.away_team.name}`,
    dateLabel: formatMatchWhen({
      scheduledAt: match.scheduled_at,
      notes: match.notes,
      isFederation: match.is_federation,
    }),
    location: match.location,
    categoryLabel,
    round: match.federation_round ?? null,
    notes: stripFmvScheduleNote(match.notes) || null,
    status: match.status,
    resultLabel: result,
    homeLabel,
    awayLabel,
    homeName: match.home_team.name,
    awayName: match.away_team.name,
    clubTeamId,
    clubLabel,
    opponentLabel,
    clubIsHome,
    homeSets,
    awaySets,
    setScores: setScores.map((set) => ({ home: set.home, away: set.away })),
    narrative: buildNarrative({
      clubLabel,
      opponentLabel,
      result,
      clubSets: clubIsHome ? homeSets : awaySets,
      oppSets: clubIsHome ? awaySets : homeSets,
      setScores,
      setsToWin: setsToWinOf(match),
      clubIsHome,
      club,
      opp,
      players: clubPlayers,
      rotations: clubRotations,
    }),
    insights: buildInsights({
      clubLabel,
      opponentLabel,
      club,
      opp,
      players: clubPlayers,
      rotations: clubRotations,
    }),
    highlights: buildHighlights(clubPlayers, club, clubLabel),
    home,
    away,
    homePlayers: sortPlayerRows(homePlayers),
    awayPlayers: sortPlayerRows(awayPlayers),
    homeRotations,
    awayRotations,
    sets,
    actions,
    glossary: GLOSSARY,
  };
}

const GLOSSARY: MatchExcelGlossaryRow[] = [
  {
    term: "Puntos",
    meaning: "Acciones que suman para el equipo: ataque, bloqueo, ace, error rival u otro punto.",
  },
  {
    term: "Errores",
    meaning: "Errores propios que regalan el punto al rival (ataque, saque, recepción, defensa u error general).",
  },
  {
    term: "Balance",
    meaning: "Puntos menos errores. En verde el jugador aporta; en rojo resta más de lo que suma.",
  },
  {
    term: "Eff. ataque",
    meaning: "(Puntos de ataque + continuaciones) / intentos. Mide cuántos ataques no son error.",
  },
  {
    term: "Continuación de ataque",
    meaning: "El remate no es punto ni error: el rival defiende y la jugada sigue.",
  },
  {
    term: "Acierto saque",
    meaning: "(Aces + saques dentro) / intentos. El error de saque resta el punto.",
  },
  {
    term: "Ace",
    meaning: "Saque directo a punto.",
  },
  {
    term: "Bloqueo (punto / toque / cont.)",
    meaning: "Punto de bloqueo, toque que no cierra el punto, o bloqueo que continúa la jugada.",
  },
  {
    term: "Recepción / defensa (B-M-M-E)",
    meaning: "Buena, media, mala y error. La efectividad es el porcentaje que no es error.",
  },
  {
    term: "Media 0–3",
    meaning: "Calidad media: buena=3, media=2, mala=1, error=0. Por encima de 2,0 es recepción/defensa sólida.",
  },
  {
    term: "Puntos recibiendo",
    meaning: "Porcentaje de puntos ganados cuando el equipo está en recepción (side-out).",
  },
  {
    term: "Puntos con el saque",
    meaning: "Porcentaje de puntos ganados cuando el equipo saca (break point).",
  },
  {
    term: "Rotación R1–R6",
    meaning: "Rendimiento según qué jugador saca. PF-PC es puntos a favor y en contra en esa rotación.",
  },
];

export function emptyPlayerTotals(): MatchExcelPlayerRow {
  return {
    playerId: "",
    teamId: "",
    jersey: null,
    name: "TOTAL",
    position: null,
    positionLabel: "",
    setsPlayed: 0,
    points: 0,
    errors: 0,
    contribution: 0,
    attack: emptyAttackStats(),
    serve: emptyServeStats(),
    blockPoints: 0,
    blockTouches: 0,
    blockContinuations: 0,
    reception: emptyReceptionStats(),
    receptionAverage: null,
    defense: emptyDefenseStats(),
    defenseAverage: null,
  };
}

export function sumPlayerRows(rows: MatchExcelPlayerRow[]): MatchExcelPlayerRow {
  const total = emptyPlayerTotals();
  for (const row of rows) {
    total.points += row.points;
    total.errors += row.errors;
    total.contribution += row.contribution;
    total.attack.kills += row.attack.kills;
    total.attack.errors += row.attack.errors;
    total.attack.continuations += row.attack.continuations;
    total.serve.aces += row.serve.aces;
    total.serve.errors += row.serve.errors;
    total.serve.inPlay += row.serve.inPlay;
    total.blockPoints += row.blockPoints;
    total.blockTouches += row.blockTouches;
    total.blockContinuations += row.blockContinuations;
    total.reception.good += row.reception.good;
    total.reception.medium += row.reception.medium;
    total.reception.bad += row.reception.bad;
    total.reception.errors += row.reception.errors;
    total.defense.good += row.defense.good;
    total.defense.medium += row.defense.medium;
    total.defense.bad += row.defense.bad;
    total.defense.errors += row.defense.errors;
    if (row.setsPlayed > total.setsPlayed) total.setsPlayed = row.setsPlayed;
  }
  total.attack.attempts = total.attack.kills + total.attack.errors + total.attack.continuations;
  total.attack.efficiency =
    total.attack.attempts === 0
      ? null
      : (total.attack.kills + total.attack.continuations) / total.attack.attempts;
  total.serve.attempts = total.serve.aces + total.serve.errors + total.serve.inPlay;
  total.serve.successRate =
    total.serve.attempts === 0 ? null : (total.serve.aces + total.serve.inPlay) / total.serve.attempts;
  total.reception.total =
    total.reception.good + total.reception.medium + total.reception.bad + total.reception.errors;
  total.reception.goodRate =
    total.reception.total === 0 ? null : total.reception.good / total.reception.total;
  total.reception.successRate =
    total.reception.total === 0
      ? null
      : (total.reception.total - total.reception.errors) / total.reception.total;
  total.receptionAverage = skillQualityAverage(total.reception);
  total.defense.total =
    total.defense.good + total.defense.medium + total.defense.bad + total.defense.errors;
  total.defense.goodRate = total.defense.total === 0 ? null : total.defense.good / total.defense.total;
  total.defense.successRate =
    total.defense.total === 0
      ? null
      : (total.defense.total - total.defense.errors) / total.defense.total;
  total.defenseAverage = skillQualityAverage(total.defense);
  return total;
}
