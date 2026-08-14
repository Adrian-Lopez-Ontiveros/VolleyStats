import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MatchForm } from "@/components/matches/match-form";
import { PageHeader } from "@/components/page-header";
import { requireAdmin } from "@/lib/auth";
import { PLAYER_ROSTER_SELECT } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import type { Match, MatchLineupEntry, Player, Team } from "@/lib/types";

export const metadata: Metadata = { title: "Editar partido" };

export default async function EditMatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireAdmin();
  const supabase = await createClient();
  const [{ data: match }, { data: teams }, { data: players }, { data: lineup }, events] =
    await Promise.all([
      supabase.from("matches").select("*").eq("id", id).maybeSingle(),
      supabase.from("teams").select("*").order("name"),
      supabase
        .from("players")
        .select(PLAYER_ROSTER_SELECT as "*")
        .order("jersey_number", { ascending: true, nullsFirst: false }),
      supabase.from("match_lineups").select("*").eq("match_id", id),
      supabase
        .from("match_events")
        .select("id", { count: "exact", head: true })
        .eq("match_id", id),
    ]);

  if (!match) notFound();

  return (
    <>
      <PageHeader
        title="Editar partido"
        description="Puedes ajustar el resultado por sets y la alineación titular del club."
      />
      <MatchForm
        match={match as Match}
        teams={(teams ?? []) as Team[]}
        players={(players ?? []) as Player[]}
        lineup={(lineup ?? []) as MatchLineupEntry[]}
        hasLiveEvents={(events.count ?? 0) > 0}
      />
    </>
  );
}
