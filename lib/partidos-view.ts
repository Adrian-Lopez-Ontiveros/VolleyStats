import { isTeamCategory, type TeamCategory } from "@/lib/categories";
import { currentJornadaNumber, parseJornadaParam } from "@/lib/federation/rounds";
import type { MatchWithTeams } from "@/lib/types";

export type PartidosPanel = "catalog" | "live";
export type PartidosListView = "list" | "calendar";

export type PartidosView = {
  category: TeamCategory | "all";
  jornada: number | null;
  panel: PartidosPanel;
  listView: PartidosListView;
};

export function resolvePartidosView(
  raw: { categoria?: string; jornada?: string; panel?: string; vista?: string },
  playerCategory: TeamCategory | null,
  matches: readonly MatchWithTeams[]
): PartidosView {
  const explicit = raw.categoria === "all" || isTeamCategory(raw.categoria);
  const category: TeamCategory | "all" =
    raw.categoria === "all"
      ? "all"
      : isTeamCategory(raw.categoria)
        ? raw.categoria
        : (playerCategory ?? "all");
  const panel: PartidosPanel = raw.panel === "directo" ? "live" : "catalog";
  const listView: PartidosListView = raw.vista === "calendario" ? "calendar" : "list";
  const jornada =
    category === "all"
      ? null
      : explicit
        ? parseJornadaParam(raw.jornada)
        : currentJornadaNumber(matches, category);

  return { category, jornada, panel, listView };
}

export function buildPartidosHref(view: PartidosView) {
  const params = new URLSearchParams();
  params.set("categoria", view.category);
  if (view.category !== "all" && view.jornada != null) {
    params.set("jornada", String(view.jornada));
  }
  if (view.panel === "live") params.set("panel", "directo");
  if (view.listView === "calendar") params.set("vista", "calendario");
  return `/partidos?${params.toString()}`;
}
