const FMV_API = "https://intranet.fmvoley.com/api";

type Json = Record<string, unknown>;

async function fmvGet<T>(path: string): Promise<T> {
  const url = path.startsWith("http") ? path : `${FMV_API}/${path.replace(/^\//, "")}`;
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "FuenlaStats/1.0 (CV Fuenlabrada)",
    },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`FMV ${path} → ${response.status}`);
  }
  return (await response.json()) as T;
}

function asRecord(value: unknown): Json {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Json) : {};
}

function asArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  const record = asRecord(value);
  for (const key of ["data", "items", "results", "partidos", "jornadas", "equipos", "grupos"]) {
    if (Array.isArray(record[key])) return record[key] as unknown[];
  }
  return [];
}

function pickString(record: Json, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return "";
}

function pickNumber(record: Json, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() && !Number.isNaN(Number(value))) {
      return Number(value);
    }
  }
  return null;
}

export type FmvGroup = {
  id: string;
  name: string;
  competition: string;
};

export type FmvTeam = {
  id: string;
  name: string;
  shortName: string;
};

export type FmvMatch = {
  id: string;
  homeName: string;
  awayName: string;
  homeId: string;
  awayId: string;
  scheduledAt: string;
  location: string;
  round: string;
  homeSets: number | null;
  awaySets: number | null;
  setScores: { home: number; away: number }[];
  finished: boolean;
};

export async function fetchFmvGroups(): Promise<FmvGroup[]> {
  const temporada = asRecord(await fmvGet("temporadas/actual"));
  const temporadaId = pickString(temporada, ["id", "idTemporada", "temporadaId"]);
  const payload = temporadaId
    ? await fmvGet(`grupos?temporada=${temporadaId}`)
    : await fmvGet("grupos");

  return asArray(payload).map((item) => {
    const row = asRecord(item);
    const competition = asRecord(row.competicion ?? row.categoria ?? row.tipo);
    return {
      id: pickString(row, ["id", "idGrupo", "grupoId"]),
      name: pickString(row, ["nombre", "name", "descripcion", "grupo"]),
      competition:
        pickString(competition, ["nombre", "name", "descripcion"]) ||
        pickString(row, ["competicionNombre", "categoria", "nombreCompeticion"]),
    };
  }).filter((item) => item.id);
}

export async function fetchFmvTeams(groupId: string): Promise<FmvTeam[]> {
  const payload = await fmvGet(`grupos/${groupId}/equipos`);
  return asArray(payload)
    .map((item) => {
      const row = asRecord(item);
      const club = asRecord(row.club ?? row.equipo);
      const name =
        pickString(row, ["nombre", "name", "equipo", "nombreEquipo"]) ||
        pickString(club, ["nombre", "name"]);
      return {
        id: pickString(row, ["id", "idEquipo", "equipoId"]),
        name,
        shortName: pickString(row, ["abreviatura", "siglas", "acronimo", "shortName"]).slice(0, 8),
      };
    })
    .filter((item) => item.id && item.name);
}

export async function fetchFmvMatches(groupId: string): Promise<FmvMatch[]> {
  const rounds = asArray(await fmvGet(`grupos/${groupId}/jornadas`));
  const matches: FmvMatch[] = [];

  for (const roundItem of rounds) {
    const round = asRecord(roundItem);
    const roundId = pickString(round, ["id", "idJornada", "jornadaId"]);
    const roundName =
      pickString(round, ["nombre", "name", "numero", "jornada"]) || "Jornada";
    if (!roundId) continue;

    const payload = await fmvGet(`jornadas/${roundId}/partidos`);
    for (const item of asArray(payload)) {
      matches.push(normalizeMatch(asRecord(item), roundName));
    }
  }

  return matches.filter((item) => item.id && item.homeName && item.awayName);
}

export async function fetchFmvActa(matchId: string) {
  try {
    return asRecord(await fmvGet(`partidos/${matchId}/acta`));
  } catch {
    return {};
  }
}

function normalizeMatch(row: Json, roundName: string): FmvMatch {
  const home = asRecord(row.local ?? row.equipoLocal ?? row.home);
  const away = asRecord(row.visitante ?? row.equipoVisitante ?? row.away);
  const result = asRecord(row.resultado ?? row.result ?? row.acta);
  const setScores = parseSetScores(row, result);
  const homeSets =
    pickNumber(row, ["setsLocal", "sets_local", "localSets"]) ??
    pickNumber(result, ["setsLocal", "sets_local", "local"]) ??
    (setScores.length ? setScores.filter((set) => set.home > set.away).length : null);
  const awaySets =
    pickNumber(row, ["setsVisitante", "sets_visitante", "visitanteSets"]) ??
    pickNumber(result, ["setsVisitante", "sets_visitante", "visitante"]) ??
    (setScores.length ? setScores.filter((set) => set.away > set.home).length : null);
  const status = pickString(row, ["estado", "status", "situacion"]).toLowerCase();

  return {
    id: pickString(row, ["id", "idPartido", "partidoId"]),
    homeName:
      pickString(home, ["nombre", "name", "equipo"]) ||
      pickString(row, ["localNombre", "equipoLocal", "local"]),
    awayName:
      pickString(away, ["nombre", "name", "equipo"]) ||
      pickString(row, ["visitanteNombre", "equipoVisitante", "visitante"]),
    homeId: pickString(home, ["id", "idEquipo"]) || pickString(row, ["idLocal", "localId"]),
    awayId: pickString(away, ["id", "idEquipo"]) || pickString(row, ["idVisitante", "visitanteId"]),
    scheduledAt: parseDate(
      pickString(row, ["fecha", "fechaHora", "datetime", "horario", "inicio"])
    ),
    location: pickString(row, ["pista", "lugar", "instalacion", "pabellon", "campo"]),
    round: pickString(row, ["jornada", "ronda"]) || roundName,
    homeSets,
    awaySets,
    setScores,
    finished:
      status.includes("final") ||
      status.includes("jugado") ||
      ((homeSets ?? 0) >= 3 || (awaySets ?? 0) >= 3),
  };
}

function parseSetScores(row: Json, result: Json) {
  const candidates = [
    row.sets,
    result.sets,
    row.set_scores,
    result.set_scores,
    row.parciales,
    result.parciales,
  ];
  for (const candidate of candidates) {
    if (!Array.isArray(candidate)) continue;
    const scores = candidate
      .map((item) => {
        if (Array.isArray(item) && item.length >= 2) {
          return { home: Number(item[0]), away: Number(item[1]) };
        }
        const record = asRecord(item);
        const home = pickNumber(record, ["local", "home", "puntosLocal", "a"]);
        const away = pickNumber(record, ["visitante", "away", "puntosVisitante", "b"]);
        if (home == null || away == null) return null;
        return { home, away };
      })
      .filter((item): item is { home: number; away: number } => Boolean(item));
    if (scores.length) return scores;
  }
  return [];
}

function parseDate(value: string) {
  if (!value) return new Date().toISOString();
  const iso = Date.parse(value);
  if (!Number.isNaN(iso)) return new Date(iso).toISOString();
  const match = value.match(
    /(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:\s+(\d{1,2}):(\d{2}))?/
  );
  if (match) {
    const [, day, month, year, hour = "18", minute = "00"] = match;
    return new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute)
    ).toISOString();
  }
  return new Date().toISOString();
}

export function applyActaToMatch(match: FmvMatch, acta: Json): FmvMatch {
  const result = asRecord(acta.resultado ?? acta.result ?? acta);
  const setScores = parseSetScores(acta, result);
  const homeSets =
    pickNumber(acta, ["setsLocal", "sets_local"]) ??
    pickNumber(result, ["setsLocal", "sets_local"]) ??
    match.homeSets;
  const awaySets =
    pickNumber(acta, ["setsVisitante", "sets_visitante"]) ??
    pickNumber(result, ["setsVisitante", "sets_visitante"]) ??
    match.awaySets;
  return {
    ...match,
    setScores: setScores.length ? setScores : match.setScores,
    homeSets,
    awaySets,
    finished:
      match.finished ||
      (homeSets ?? 0) >= 3 ||
      (awaySets ?? 0) >= 3,
  };
}
