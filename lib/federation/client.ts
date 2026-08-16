const FMV_API = "https://intranet.fmvoley.com/api";

type Json = Record<string, unknown>;

export type FmvOption = {
  id: string;
  name: string;
};

export type FmvGroup = {
  id: string;
  name: string;
  competition: string;
  division: string;
  phase: string;
  typeName: string;
  path: string;
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

export type FmvCatalogPath = {
  typeId: string;
  typeName: string;
  competitionId: string;
  competitionName: string;
  divisionId: string;
  divisionName: string;
  phaseId: string;
  phaseName: string;
  groupId: string;
  groupName: string;
};

export const FMV_TEST_LEAGUE = {
  label: "Cadete Femenino · 1ª División Autonómica Preferente · Grupo Único",
  typeIncludes: ["federad"],
  competitionIncludes: ["cadete", "fem"],
  divisionIncludes: ["preferente"],
  phaseIncludes: ["regular"],
  groupIncludes: ["unico"],
} as const;

async function fmvGet<T>(path: string, params?: Record<string, string | number>): Promise<T> {
  const url = new URL(`${FMV_API}/${path.replace(/^\//, "")}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null || value === "") continue;
      url.searchParams.set(key, String(value));
    }
  }

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

  const payload = (await response.json()) as Json;
  const err = asRecord(payload.Error ?? payload.error);
  if (err.HasError === true || err.hasError === true) {
    throw new Error(
      pickString(err, ["Message", "message"]) || `FMV ${path} devolvió un error`
    );
  }

  return (payload.content ?? payload) as T;
}

function asRecord(value: unknown): Json {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Json) : {};
}

function asArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  const record = asRecord(value);
  for (const key of ["data", "items", "results", "content", "partidos", "jornadas", "equipos", "grupos"]) {
    if (Array.isArray(record[key])) return record[key] as unknown[];
  }
  return [];
}

function pickString(record: Json, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
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

function pickBoolean(record: Json, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "boolean") return value;
    if (value === 1 || value === "1" || value === "true") return true;
    if (value === 0 || value === "0" || value === "false") return false;
  }
  return false;
}

export function foldFmvText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function matchesAll(text: string, needles: readonly string[]) {
  const haystack = foldFmvText(text);
  return needles.every((needle) => haystack.includes(foldFmvText(needle)));
}

function findOption(options: FmvOption[], needles: readonly string[]) {
  return options.find((option) => matchesAll(option.name, needles)) ?? null;
}

function optionFromRow(row: unknown, nameKeys: string[]): FmvOption | null {
  const record = asRecord(row);
  const id = pickString(record, ["id"]);
  const name = pickString(record, nameKeys);
  if (!id || !name) return null;
  return { id, name };
}

function teamIdFromCrest(url: string) {
  const match = url.match(/[?&]Id=(\d+)/i);
  return match?.[1] ?? "";
}

function isByeName(name: string) {
  const haystack = foldFmvText(name);
  return !haystack || haystack === "descanso" || haystack.includes("descanso");
}

async function mapPool<T, R>(items: T[], limit: number, mapper: (item: T) => Promise<R>) {
  const results: R[] = [];
  for (let index = 0; index < items.length; index += limit) {
    const chunk = items.slice(index, index + limit);
    results.push(...(await Promise.all(chunk.map(mapper))));
  }
  return results;
}

export async function fetchFmvCompetitionTypes(): Promise<FmvOption[]> {
  return asArray(await fmvGet("competiciones/getTiposCompeticion"))
    .map((row) => optionFromRow(row, ["nombre", "name"]))
    .filter((item): item is FmvOption => Boolean(item));
}

export async function fetchFmvCompetitions(typeId: string): Promise<FmvOption[]> {
  return asArray(await fmvGet("competiciones/getCompeticiones", { tipoCompeticionId: typeId }))
    .map((row) => optionFromRow(row, ["nombre_comp", "nombre", "name"]))
    .filter((item): item is FmvOption => Boolean(item));
}

export async function fetchFmvDivisions(competitionId: string): Promise<FmvOption[]> {
  return asArray(
    await fmvGet("competiciones/getCompeticionesTemporada", { competicionId: competitionId })
  )
    .map((row) => optionFromRow(row, ["nombre", "name"]))
    .filter((item): item is FmvOption => Boolean(item));
}

export async function fetchFmvPhases(divisionId: string): Promise<FmvOption[]> {
  return asArray(
    await fmvGet("competiciones/getFasesCompeticion", { competicionTemporadaId: divisionId })
  )
    .map((row) => optionFromRow(row, ["nombre", "name"]))
    .filter((item): item is FmvOption => Boolean(item));
}

export async function fetchFmvGroupOptions(phaseId: string): Promise<FmvOption[]> {
  return asArray(await fmvGet("competiciones/getGruposCompeticion", { faseId: phaseId }))
    .map((row) => optionFromRow(row, ["nombre", "name", "descripcion"]))
    .filter((item): item is FmvOption => Boolean(item));
}

export async function fetchFmvGroupInfo(groupId: string): Promise<FmvGroup> {
  const row = asRecord(await fmvGet("competiciones/getDatosGrupoCompeticion", { grupoId: groupId }));
  const name = pickString(row, ["nombre", "name"]) || "Grupo";
  const competition = pickString(row, ["competicion"]);
  const division = pickString(row, ["division"]);
  const phase = pickString(row, ["fase"]);
  const typeName = pickString(row, ["tipoCompeticion"]);
  return {
    id: pickString(row, ["id"]) || groupId,
    name,
    competition,
    division,
    phase,
    typeName,
    path:
      pickString(row, ["rutaCompleta"]) ||
      [typeName, competition, division, phase, name].filter(Boolean).join(" · "),
  };
}

export async function fetchFmvTeams(groupId: string): Promise<FmvTeam[]> {
  const fromStandings = asArray(
    await fmvGet("competiciones/getClasificacionGrupo", { grupoId: groupId })
  )
    .map((item) => {
      const row = asRecord(item);
      const name = pickString(row, ["nombre", "name", "equipo"]);
      const id =
        pickString(row, ["equipoId", "idEquipo", "equipo_id"]) ||
        teamIdFromCrest(pickString(row, ["imagen", "img"]));
      return {
        id,
        name,
        shortName: name.replace(/\s+/g, " ").slice(0, 8).trim(),
      };
    })
    .filter((item) => item.id && item.name && !isByeName(item.name));

  if (fromStandings.length) return uniqueTeams(fromStandings);

  const matches = await fetchFmvMatches(groupId);
  return uniqueTeams(
    matches.flatMap((match) => [
      { id: match.homeId, name: match.homeName, shortName: match.homeName.slice(0, 8) },
      { id: match.awayId, name: match.awayName, shortName: match.awayName.slice(0, 8) },
    ])
  );
}

export async function fetchFmvMatches(groupId: string): Promise<FmvMatch[]> {
  const rounds = asArray(await fmvGet("competiciones/getJornadasGrupo", { grupoId: groupId }));
  const fromRounds = (
    await mapPool(rounds, 4, async (roundItem) => {
      const round = asRecord(roundItem);
      const roundId = pickString(round, ["id", "idJornada", "jornadaId"]);
      const roundName = formatRoundName(round);
      if (!roundId) return [] as FmvMatch[];

      const payload = await fmvGet("competiciones/getPartidosByJornada", { jornadaId: roundId });
      return asArray(payload).map((item) => normalizeMatch(asRecord(item), roundName));
    })
  ).flat();

  if (fromRounds.length) {
    return fromRounds.filter((item) => item.id && item.homeName && item.awayName);
  }

  const calendar = asArray(await fmvGet("competiciones/getJornadasCalendario", { grupoId: groupId }));
  return calendar
    .flatMap((roundItem) => {
      const round = asRecord(roundItem);
      const roundName = formatRoundName(round);
      return asArray(round.partidos).map((item) => normalizeMatch(asRecord(item), roundName));
    })
    .filter((item) => item.id && item.homeName && item.awayName);
}

export async function resolveFmvTestLeague(): Promise<FmvCatalogPath> {
  const types = await fetchFmvCompetitionTypes();
  const type =
    findOption(types, FMV_TEST_LEAGUE.typeIncludes) ??
    types.find((item) => foldFmvText(item.name).includes("federad")) ??
    types[0];
  if (!type) throw new Error("FMV no devolvió tipos de competición.");

  const competitions = await fetchFmvCompetitions(type.id);
  const competition = findOption(competitions, FMV_TEST_LEAGUE.competitionIncludes);
  if (!competition) {
    throw new Error("No se encontró Cadete Femenino en la API de la FMV.");
  }

  const divisions = await fetchFmvDivisions(competition.id);
  const division =
    findOption(divisions, FMV_TEST_LEAGUE.divisionIncludes) ??
    findOption(divisions, ["1", "preferente"]) ??
    divisions[0];
  if (!division) {
    throw new Error("No se encontró 1ª División Autonómica Preferente.");
  }

  const phases = await fetchFmvPhases(division.id);
  const phase = findOption(phases, FMV_TEST_LEAGUE.phaseIncludes) ?? phases[0];
  if (!phase) throw new Error("No se encontraron fases de esa competición.");

  const groups = await fetchFmvGroupOptions(phase.id);
  const group = findOption(groups, FMV_TEST_LEAGUE.groupIncludes) ?? groups[0];
  if (!group) throw new Error("No se encontró el Grupo Único.");

  return {
    typeId: type.id,
    typeName: type.name,
    competitionId: competition.id,
    competitionName: competition.name,
    divisionId: division.id,
    divisionName: division.name,
    phaseId: phase.id,
    phaseName: phase.name,
    groupId: group.id,
    groupName: group.name,
  };
}

function uniqueTeams(teams: FmvTeam[]) {
  const seen = new Map<string, FmvTeam>();
  for (const team of teams) {
    if (!team.id || !team.name || isByeName(team.name)) continue;
    if (!seen.has(team.id)) seen.set(team.id, team);
  }
  return [...seen.values()];
}

function formatRoundName(round: Json) {
  const number = pickString(round, ["numero", "numJornada", "jornada"]);
  if (number) return `Jornada ${number}`;
  return pickString(round, ["nombre", "name", "fecha"]) || "Jornada";
}

function normalizeMatch(row: Json, roundName: string): FmvMatch {
  const homeName =
    pickString(row, ["equipo_local", "localNombre", "equipoLocal", "local"]) ||
    pickString(asRecord(row.local ?? row.equipoLocal), ["nombre", "name", "equipo"]);
  const awayName =
    pickString(row, ["equipo_visitante", "visitanteNombre", "equipoVisitante", "visitante"]) ||
    pickString(asRecord(row.visitante ?? row.equipoVisitante), ["nombre", "name", "equipo"]);
  const homeId =
    teamIdFromCrest(pickString(row, ["img_local", "imagenLocal"])) ||
    pickString(row, ["equipoLocalId", "idLocal", "localId"]);
  const awayId =
    teamIdFromCrest(pickString(row, ["img_visitante", "imagenVisitante"])) ||
    pickString(row, ["equipoVisitanteId", "idVisitante", "visitanteId"]);
  const setScores = parseSetScores(row);
  const finishedFlag = pickBoolean(row, ["finalizado", "finished", "jugado"]);
  const homeSets =
    pickNumber(row, ["sets_local", "setsLocal", "localSets"]) ??
    (setScores.length ? setScores.filter((set) => set.home > set.away).length : null);
  const awaySets =
    pickNumber(row, ["sets_visitante", "setsVisitante", "visitanteSets"]) ??
    (setScores.length ? setScores.filter((set) => set.away > set.home).length : null);
  const finished =
    finishedFlag ||
    ((homeSets ?? 0) >= 3 || (awaySets ?? 0) >= 3);

  return {
    id: pickString(row, ["id", "idPartido", "partidoId"]),
    homeName: isByeName(homeName) ? "" : homeName,
    awayName: isByeName(awayName) ? "" : awayName,
    homeId,
    awayId,
    scheduledAt: parseDate(
      pickString(row, ["fecha_hora", "fechaHora", "datetime", "horario"]) ||
        [pickString(row, ["fecha"]), pickString(row, ["hora"])].filter(Boolean).join(" ")
    ),
    location: sanitizeLocation(
      pickString(row, ["pabellon", "pista", "ubicacion", "lugar", "instalacion", "direccion"])
    ),
    round: pickString(row, ["jornada", "ronda"]) || roundName,
    homeSets: finished ? homeSets : homeSets && homeSets > 0 ? homeSets : null,
    awaySets: finished ? awaySets : awaySets && awaySets > 0 ? awaySets : null,
    setScores,
    finished,
  };
}

function sanitizeLocation(value: string) {
  const folded = foldFmvText(value);
  if (!folded || folded === "por definir" || folded === "-") return "";
  return value;
}

function parseSetScores(row: Json) {
  const scores: { home: number; away: number }[] = [];
  for (let setNumber = 1; setNumber <= 5; setNumber += 1) {
    const home = pickNumber(row, [
      `puntos_local_juego_${setNumber}`,
      `puntosLocal${setNumber}`,
      `set${setNumber}Local`,
    ]);
    const away = pickNumber(row, [
      `puntos_visitante_juego_${setNumber}`,
      `puntosVisitante${setNumber}`,
      `set${setNumber}Visitante`,
    ]);
    if (home == null || away == null) continue;
    if (home === 0 && away === 0) continue;
    scores.push({ home, away });
  }
  if (scores.length) return scores;

  const candidates = [row.sets, row.set_scores, row.parciales];
  for (const candidate of candidates) {
    if (!Array.isArray(candidate)) continue;
    const parsed = candidate
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
    if (parsed.length) return parsed;
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
