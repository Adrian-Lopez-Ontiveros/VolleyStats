import { SETS_TO_WIN, maxSetsOf } from "@/lib/constants";
import type { MatchStatus, SetScore } from "@/lib/types";

export function isCompletedSetScore(home: number, away: number) {
  const leader = Math.max(home, away);
  const trailer = Math.min(home, away);
  return leader !== trailer && leader >= 15 && leader - trailer >= 2;
}

export function parseManualSetScores(
  formData: FormData,
  setsToWin = SETS_TO_WIN
): {
  scores: SetScore[];
  error?: string;
} {
  const scores: SetScore[] = [];
  const needed = setsToWin === 2 ? 2 : SETS_TO_WIN;
  const lastSet = maxSetsOf(needed);

  for (let setNumber = 1; setNumber <= lastSet; setNumber += 1) {
    const homeRaw = String(formData.get(`set${setNumber}Home`) ?? "").trim();
    const awayRaw = String(formData.get(`set${setNumber}Away`) ?? "").trim();

    if (!homeRaw && !awayRaw) continue;

    if (scores.length + 1 !== setNumber) {
      return {
        scores: [],
        error: `Completa el set ${scores.length + 1} antes del set ${setNumber}.`,
      };
    }

    const home = Number(homeRaw);
    const away = Number(awayRaw);
    if (!Number.isInteger(home) || !Number.isInteger(away) || home < 0 || away < 0) {
      return { scores: [], error: `El marcador del set ${setNumber} no es válido.` };
    }
    if (home === away) {
      return { scores: [], error: `El set ${setNumber} no puede terminar en empate.` };
    }
    if (!isCompletedSetScore(home, away)) {
      return {
        scores: [],
        error: `El set ${setNumber} (${home}-${away}) no es un resultado válido. Debe haber 2 puntos de diferencia y al menos 15 puntos.`,
      };
    }

    const homeSets = scores.filter((set) => set.home > set.away).length;
    const awaySets = scores.filter((set) => set.away > set.home).length;
    if (homeSets >= needed || awaySets >= needed) {
      return {
        scores: [],
        error: "El partido ya estaba decidido. No hace falta un set extra.",
      };
    }

    scores.push({ home, away });
  }

  return { scores };
}

export function matchScoreFromSets(
  scores: SetScore[],
  currentStatus: MatchStatus,
  setsToWin = SETS_TO_WIN
): {
  set_scores: SetScore[];
  home_sets: number;
  away_sets: number;
  current_set: number;
  home_points: number;
  away_points: number;
  status: MatchStatus;
} {
  const needed = setsToWin === 2 ? 2 : SETS_TO_WIN;
  const homeSets = scores.filter((set) => set.home > set.away).length;
  const awaySets = scores.filter((set) => set.away > set.home).length;
  const finished = homeSets >= needed || awaySets >= needed;

  return {
    set_scores: scores,
    home_sets: homeSets,
    away_sets: awaySets,
    current_set: finished ? Math.max(1, scores.length) : Math.min(maxSetsOf(needed), scores.length + 1),
    home_points: 0,
    away_points: 0,
    status: finished ? "finished" : currentStatus === "cancelled" ? "cancelled" : currentStatus,
  };
}

export function parseSetsToWin(formData: FormData) {
  return String(formData.get("setsToWin") ?? "") === "2" ? 2 : SETS_TO_WIN;
}

export function parseLineupFromForm(formData: FormData): {
  teamId: string | null;
  starterIds: string[];
  starterPositions: Partial<Record<number, string>>;
  receptionLiberoId: string | null;
  defenseLiberoId: string | null;
  liberoId: string | null;
  error?: string;
} {
  const teamId = String(formData.get("clubTeamId") ?? "").trim() || null;
  const legacyLiberoId = String(formData.get("liberoId") ?? "").trim() || null;
  const receptionLiberoId =
    String(formData.get("receptionLiberoId") ?? "").trim() || legacyLiberoId;
  const defenseLiberoId =
    String(formData.get("defenseLiberoId") ?? "").trim() || legacyLiberoId;
  const liberoIds = new Set(
    [receptionLiberoId, defenseLiberoId].filter((playerId): playerId is string => Boolean(playerId))
  );
  const starterPositions: Partial<Record<number, string>> = {};
  const seenPlayers = new Set<string>();

  function fail(error: string) {
    return {
      teamId,
      starterIds: [] as string[],
      starterPositions,
      receptionLiberoId,
      defenseLiberoId,
      liberoId: receptionLiberoId ?? defenseLiberoId,
      error,
    };
  }

  for (let position = 1; position <= 6; position += 1) {
    const playerId = String(formData.get(`starterPos${position}`) ?? "").trim();
    if (!playerId) continue;
    if (seenPlayers.has(playerId)) {
      return fail("Un jugador no puede ocupar dos posiciones a la vez.");
    }
    if (liberoIds.has(playerId)) {
      return fail("El líbero no ocupa una de las 6 posiciones de pista.");
    }
    seenPlayers.add(playerId);
    starterPositions[position] = playerId;
  }

  const starterIds = Object.values(starterPositions).filter((playerId): playerId is string => Boolean(playerId));
  if (starterIds.length === 0) {
    const legacyIds = [...new Set(formData.getAll("starterId").map(String).filter(Boolean))];
    if (legacyIds.length > 6) {
      return fail("La alineación titular admite como máximo 6 jugadores.");
    }
    return {
      teamId,
      starterIds: legacyIds,
      starterPositions,
      receptionLiberoId,
      defenseLiberoId,
      liberoId: receptionLiberoId ?? defenseLiberoId,
    };
  }

  return {
    teamId,
    starterIds,
    starterPositions,
    receptionLiberoId,
    defenseLiberoId,
    liberoId: receptionLiberoId ?? defenseLiberoId,
  };
}
