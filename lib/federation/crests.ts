const FMV_CREST = "https://intranet.fmvoley.com/api/escudos/fotoEscudoEquipoTemporada";

export function fmvCrestUrl(federationTeamId?: string | null) {
  const id = federationTeamId?.trim();
  if (!id) return null;
  return `${FMV_CREST}?Id=${encodeURIComponent(id)}`;
}

export function resolveTeamLogoUrl(team: {
  logo_url?: string | null;
  federation_team_id?: string | null;
}) {
  return team.logo_url || fmvCrestUrl(team.federation_team_id);
}
