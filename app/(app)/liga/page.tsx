import type { Metadata } from "next";
import { LeagueBrowser } from "@/components/stats/league-browser";
import { requireViewer, resolveViewerPlayerCategory } from "@/lib/auth";
import { isTeamCategory, parseCategory } from "@/lib/categories";
import { getFinishedMatches, getTeams } from "@/lib/data";
import type { MatchStandingInput } from "@/lib/stats";
import type { Team } from "@/lib/types";

export const metadata: Metadata = { title: "Clasificación" };
export const maxDuration = 300;

export default async function LeaguePage({
  searchParams,
}: {
  searchParams: Promise<{ categoria?: string }>;
}) {
  const [{ categoria: rawCategory }, viewer] = await Promise.all([searchParams, requireViewer()]);
  const [{ data: teams, error: teamsError }, { data: matches, error: matchesError }, playerCategory] =
    await Promise.all([
      getTeams(),
      getFinishedMatches(),
      resolveViewerPlayerCategory(viewer.user),
    ]);
  const categoria = isTeamCategory(rawCategory) ? rawCategory : (playerCategory ?? parseCategory(rawCategory));

  return (
    <LeagueBrowser
      teams={(teams ?? []) as Team[]}
      matches={(matches ?? []) as MatchStandingInput[]}
      canManage={viewer.canManage}
      isAdmin={viewer.isAdmin}
      initialCategory={categoria}
      loadError={teamsError?.message ?? matchesError?.message}
    />
  );
}
