import { MatchesBrowser } from "@/components/matches/matches-browser";
import { requireViewer } from "@/lib/auth";
import { isTeamCategory } from "@/lib/categories";
import { getMatchesList } from "@/lib/data";
import type { MatchWithTeams } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function MatchesPage({
  searchParams,
}: {
  searchParams: Promise<{ categoria?: string }>;
}) {
  const { categoria: rawCategory } = await searchParams;
  const { canManage, isGuest } = await requireViewer();
  const categoria = isTeamCategory(rawCategory) ? rawCategory : "all";
  const { data, error } = await getMatchesList();

  return (
    <MatchesBrowser
      matches={(data ?? []) as MatchWithTeams[]}
      canManage={canManage}
      isGuest={isGuest}
      initialCategory={categoria}
      loadError={error?.message}
    />
  );
}
