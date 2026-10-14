const FMV_CREST = "https://intranet.fmvoley.com/api/escudos/fotoEscudoEquipoTemporada";

const CLUB_CREST_URL =
  "https://xeejstlubpcknzwzdcdc.supabase.co/storage/v1/object/public/avatars/teams/3914dfca-e72d-4f83-95ea-cc39997a85ef/logo-1786706726921.png";

const CLUB_CREST_FEDERATION_IDS = new Set(["51848", "51851"]);

export function fmvCrestUrl(federationTeamId?: string | null) {
  const id = federationTeamId?.trim();
  if (!id) return null;
  return `${FMV_CREST}?Id=${encodeURIComponent(id)}`;
}

function usesEmptyFederationCrest(logoUrl?: string | null, federationTeamId?: string | null) {
  const id = federationTeamId?.trim();
  if (id && CLUB_CREST_FEDERATION_IDS.has(id) && !logoUrl) return true;
  if (!logoUrl) return false;
  return [...CLUB_CREST_FEDERATION_IDS].some((teamId) => logoUrl.includes(`Id=${teamId}`));
}

export function resolveTeamLogoUrl(team: {
  logo_url?: string | null;
  federation_team_id?: string | null;
}) {
  if (usesEmptyFederationCrest(team.logo_url, team.federation_team_id)) return CLUB_CREST_URL;
  return team.logo_url || fmvCrestUrl(team.federation_team_id);
}
