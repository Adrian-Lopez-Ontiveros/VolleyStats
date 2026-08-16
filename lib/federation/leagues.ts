import type { TeamCategory } from "@/lib/categories";

export const FEDERATION_LEAGUES: {
  category: TeamCategory;
  keywords: string[];
}[] = [
  {
    category: "cadete_femenino",
    keywords: ["cadete", "fem"],
  },
  {
    category: "senior_masculino",
    keywords: ["senior", "masc"],
  },
  {
    category: "senior_femenino",
    keywords: ["senior", "fem"],
  },
];

export function inferCategoryFromFmv(text: string): TeamCategory | null {
  return matchFederationLeague(text);
}

export function matchFederationLeague(text: string): TeamCategory | null {
  const haystack = text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (haystack.includes("playa") || haystack.includes("minivoley")) return null;

  const ranked = FEDERATION_LEAGUES.filter((league) =>
    league.keywords.every((keyword) => haystack.includes(keyword))
  );

  if (ranked.length === 1) return ranked[0].category;
  if (haystack.includes("cadete") && haystack.includes("fem")) return "cadete_femenino";
  if (haystack.includes("senior") && haystack.includes("masc")) return "senior_masculino";
  if (haystack.includes("senior") && haystack.includes("fem")) return "senior_femenino";
  return null;
}

export function canTrackLiveMatch(match: {
  is_federation?: boolean;
  home_team?: { is_club_team?: boolean } | null;
  away_team?: { is_club_team?: boolean } | null;
}) {
  if (!match.is_federation) return true;
  return Boolean(match.home_team?.is_club_team || match.away_team?.is_club_team);
}

export function isClubTeamName(name: string) {
  const haystack = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  return haystack.includes("fuenlabrada") || haystack.includes("cvf ");
}
