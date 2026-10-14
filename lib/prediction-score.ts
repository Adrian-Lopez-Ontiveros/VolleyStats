export type ExactScore = { home: number; away: number };

export type ScoreSide = "home" | "away";

/** Marcadores posibles si gana ese equipo. Mejor de 5: 3-0, 3-1, 3-2. Mejor de 3: 2-0, 2-1. */
export function exactScoreOptions(winner: ScoreSide, setsToWin: number): ExactScore[] {
  const win = setsToWin === 2 ? 2 : 3;
  const losses = win === 2 ? [0, 1] : [0, 1, 2];
  return losses.map((lost) =>
    winner === "home" ? { home: win, away: lost } : { home: lost, away: win }
  );
}

export function isExactScoreForWinner(score: ExactScore, winner: ScoreSide, setsToWin: number) {
  return exactScoreOptions(winner, setsToWin).some(
    (option) => option.home === score.home && option.away === score.away
  );
}

export function cleanPredictedSets(
  winner: ScoreSide,
  setsToWin: number,
  homeSets?: number | null,
  awaySets?: number | null
): { home: number | null; away: number | null } | { error: string } {
  const home = homeSets ?? null;
  const away = awaySets ?? null;
  if (home == null && away == null) return { home: null, away: null };
  if (home == null || away == null || !Number.isInteger(home) || !Number.isInteger(away)) {
    return { error: "El resultado exacto tiene que incluir los dos números" };
  }
  if (!isExactScoreForWinner({ home, away }, winner, setsToWin)) {
    return { error: "Ese resultado no corresponde al equipo que has elegido" };
  }
  return { home, away };
}

/** Puntos de la clasificación. Sin columna nueva, un acierto de equipo sigue valiendo 1. */
export function predictionTablePoints(row: { is_correct?: boolean | null; points?: number | null }) {
  if (row.points === 0 || row.points === 1 || row.points === 2) return row.points;
  if (row.is_correct) return 1;
  return 0;
}

export function missingPredictionScoreColumn(message?: string | null) {
  return Boolean(
    message &&
      /predicted_home_sets|predicted_away_sets|match_predictions\.points|'points'|"points"/i.test(message)
  );
}

export function missingPredictionScoreArgs(message?: string | null) {
  return Boolean(message && /p_home_sets|p_away_sets/i.test(message));
}
