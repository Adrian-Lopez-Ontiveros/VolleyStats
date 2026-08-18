export type SetPhase = "all" | "early" | "late";
export type PossessionPhase = "all" | "serving" | "receiving";

export type PhaseFilter = {
  sets: SetPhase;
  possession: PossessionPhase;
};

export const DEFAULT_PHASE_FILTER: PhaseFilter = {
  sets: "all",
  possession: "all",
};

export type FilterableEvent = {
  set_number?: number | null;
  serving_team_id?: string | null;
};

export function filterEventsByPhase<T extends FilterableEvent>(
  events: T[],
  filter: PhaseFilter,
  teamId?: string | null
): T[] {
  return events.filter((event) => {
    const setNumber = event.set_number ?? 0;
    if (filter.sets === "early" && setNumber > 2) return false;
    if (filter.sets === "late" && setNumber < 3) return false;

    if (filter.possession !== "all") {
      if (!teamId || !event.serving_team_id) return false;
      const serving = event.serving_team_id === teamId;
      if (filter.possession === "serving" && !serving) return false;
      if (filter.possession === "receiving" && serving) return false;
    }

    return true;
  });
}

export const SET_PHASE_OPTIONS: { id: SetPhase; label: string }[] = [
  { id: "all", label: "Todos los sets" },
  { id: "early", label: "Primeros sets" },
  { id: "late", label: "Sets finales" },
];

export const POSSESSION_OPTIONS: { id: PossessionPhase; label: string }[] = [
  { id: "all", label: "Todo" },
  { id: "serving", label: "Al sacar" },
  { id: "receiving", label: "Al recibir" },
];
