import type { TeamCategory } from "@/lib/categories";

/**
 * Fuentes de datos de federación. FMV (Federación de Madrid) es la de siempre y
 * sus ids se guardan tal cual. esvoley (RFEVB, ligas nacionales) usa la misma
 * plataforma y el mismo formato de API, pero sus ids numéricos pueden chocar con
 * los de FMV en los índices únicos de teams/matches, así que se guardan con el
 * prefijo «esv:» (equipo esv:71413, partido esv:3061, grupo esv:103).
 */
export type FederationSource = "fmv" | "esvoley";

export const ESVOLEY_ID_PREFIX = "esv:";

export const FEDERATION_SOURCES: Record<
  FederationSource,
  { api: string; crest: string; label: string; prefix: string }
> = {
  fmv: {
    api: "https://intranet.fmvoley.com/api",
    crest: "https://intranet.fmvoley.com/api/escudos/fotoEscudoEquipoTemporada",
    label: "FMV",
    prefix: "",
  },
  esvoley: {
    api: "https://rfevb.fontventa.com/api",
    crest: "https://intranet.esvoley.es/api/escudos/fotoEscudoEquipoTemporada",
    label: "esvoley",
    prefix: ESVOLEY_ID_PREFIX,
  },
};

export function federationSourceOf(id?: string | null): FederationSource {
  return id?.trim().toLowerCase().startsWith(ESVOLEY_ID_PREFIX) ? "esvoley" : "fmv";
}

/** «esv:103» → { source: "esvoley", rawId: "103" }; «51848» → { source: "fmv", rawId: "51848" }. */
export function splitFederationId(id: string) {
  const trimmed = id.trim();
  const source = federationSourceOf(trimmed);
  const prefix = FEDERATION_SOURCES[source].prefix;
  return { source, rawId: prefix ? trimmed.slice(prefix.length) : trimmed };
}

export function prefixFederationId(source: FederationSource, rawId: string) {
  const id = rawId.trim();
  if (!id) return "";
  return `${FEDERATION_SOURCES[source].prefix}${id}`;
}

/**
 * Ligas del club que vienen de esvoley. No se buscan en un catálogo como las de
 * FMV: el grupo es fijo y se comprueba que el equipo del club está dentro.
 * https://esvoley.es/voleibol/competiciones-masculinas/primera-division-masculina/grupo-d
 */
export const ESVOLEY_CLUB_LEAGUES: {
  category: TeamCategory;
  groupId: string;
  teamId: string;
  path: string;
}[] = [
  {
    category: "nacional_masculino",
    groupId: "esv:103",
    teamId: "esv:71413",
    path: "RFEVB · Primera División Masculina · Liga regular · Grupo D",
  },
];

export function esvoleyLeagueFor(category: string) {
  return ESVOLEY_CLUB_LEAGUES.find((league) => league.category === category) ?? null;
}
