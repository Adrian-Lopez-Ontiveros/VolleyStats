import type { Metadata } from "next";
import { LeagueBrowser } from "@/components/stats/league-browser";
import { requireViewer } from "@/lib/auth";
import { parseCategory } from "@/lib/categories";
import { getFinishedMatches, getTeams } from "@/lib/data";
import type { MatchStandingInput } from "@/lib/stats";
import type { Team } from "@/lib/types";

export const metadata: Metadata = { title: "Clasificación" };

export default async function LeaguePage({
  searchParams,
}: {
  searchParams: Promise<{ categoria?: string }>;
}) {
  const { categoria: rawCategory } = await searchParams;
  const { isAdmin } = await requireViewer();
  const categoria = parseCategory(rawCategory);

  const [{ data: teams, error: teamsError }, { data: matches, error: matchesError }] =
    await Promise.all([getTeams(), getFinishedMatches()]);

  return (
    <LeagueBrowser
      teams={(teams ?? []) as Team[]}
      matches={(matches ?? []) as MatchStandingInput[]}
      isAdmin={isAdmin}
      initialCategory={categoria}
      loadError={teamsError?.message ?? matchesError?.message}
    />
  );
}
