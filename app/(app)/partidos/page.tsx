import { MatchesBrowser } from "@/components/matches/matches-browser";
import { requireViewer, resolveViewerPlayerCategory } from "@/lib/auth";
import { getMatchesList } from "@/lib/data";
import { resolvePartidosView } from "@/lib/partidos-view";
import type { MatchWithTeams } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function MatchesPage({
  searchParams,
}: {
  searchParams: Promise<{ categoria?: string; jornada?: string; panel?: string; vista?: string }>;
}) {
  const [raw, viewer] = await Promise.all([searchParams, requireViewer()]);
  const [{ data, error }, playerCategory] = await Promise.all([
    getMatchesList(),
    resolveViewerPlayerCategory(viewer.user),
  ]);
  const matches = (data ?? []) as MatchWithTeams[];
  const view = resolvePartidosView(raw, playerCategory, matches);

  return (
    <MatchesBrowser
      matches={matches}
      canManage={viewer.canManage}
      isGuest={viewer.isGuest}
      initialCategory={view.category}
      initialJornada={view.jornada}
      initialPanel={view.panel}
      initialListView={view.listView}
      loadError={error?.message}
    />
  );
}
