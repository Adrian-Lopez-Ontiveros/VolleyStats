import type { Metadata } from "next";
import { MatchForm } from "@/components/matches/match-form";
import { PageHeader } from "@/components/page-header";
import { requireAdmin } from "@/lib/auth";
import { PLAYER_LINEUP_SELECT, TEAM_SELECT } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import type { Player, Team } from "@/lib/types";

export const metadata: Metadata = { title: "Nuevo partido" };

export default async function NewMatchPage() {
  await requireAdmin();
  const supabase = await createClient();
  const [{ data: teams }, { data: players }] = await Promise.all([
    supabase.from("teams").select(TEAM_SELECT as "*").order("name"),
    supabase
      .from("players")
      .select(PLAYER_LINEUP_SELECT as "*")
      .order("jersey_number", { ascending: true, nullsFirst: false }),
  ]);

  return (
    <>
      <PageHeader
        title="Nuevo partido"
        description="Se guarda como amistoso: no cuenta en la liga FMV. Puedes escribir un rival que no esté en la clasificación."
      />
      <MatchForm teams={(teams ?? []) as Team[]} players={(players ?? []) as Player[]} />
    </>
  );
}
