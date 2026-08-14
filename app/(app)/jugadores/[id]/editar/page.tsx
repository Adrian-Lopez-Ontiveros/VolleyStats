import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PlayerForm } from "@/components/players/player-form";
import { PageHeader } from "@/components/page-header";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Player, Team } from "@/lib/types";

export const metadata: Metadata = { title: "Editar jugador" };

export default async function EditPlayerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireAdmin();
  const supabase = await createClient();
  const [{ data: player }, { data: teams }] = await Promise.all([
    supabase.from("players").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("teams")
      .select("*")
      .order("name"),
  ]);
  if (!player) notFound();

  return (
    <>
      <PageHeader title="Editar jugador" />
      <PlayerForm player={player as Player} teams={(teams ?? []) as Team[]} />
    </>
  );
}
