export const TEAM_CATEGORIES = [
  {
    id: "cadete_femenino",
    label: "Cadete Femenino",
    line1: "Cadete",
    line2: "Femenino",
    clubName: "CV Fuenlabrada Cadete Femenino",
    clubShort: "CVF CF",
  },
  {
    id: "senior_masculino",
    label: "Senior Masculino",
    line1: "Senior",
    line2: "Masculino",
    clubName: "CV Fuenlabrada Senior Masculino",
    clubShort: "CVF SM",
  },
  {
    id: "senior_femenino",
    label: "Senior Femenino",
    line1: "Senior",
    line2: "Femenino",
    clubName: "CV Fuenlabrada Senior Femenino",
    clubShort: "CVF SF",
  },
] as const;

export type TeamCategory = (typeof TEAM_CATEGORIES)[number]["id"];

export const TEAM_CATEGORY_IDS = TEAM_CATEGORIES.map((item) => item.id) as [
  TeamCategory,
  ...TeamCategory[],
];

export function isTeamCategory(value: string | null | undefined): value is TeamCategory {
  return TEAM_CATEGORIES.some((item) => item.id === value);
}

export function parseCategory(value: string | null | undefined): TeamCategory {
  return isTeamCategory(value) ? value : TEAM_CATEGORIES[0].id;
}

export function getCategoryMeta(value: string | null | undefined) {
  return TEAM_CATEGORIES.find((item) => item.id === value) ?? TEAM_CATEGORIES[0];
}
