import type { Metadata } from "next";
import { PlayerForm } from "@/components/players/player-form";
import { PageHeader } from "@/components/page-header";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Team } from "@/lib/types";

export const metadata: Metadata = { title: "Nuevo jugador" };

export default async function NewPlayerPage({
  searchParams,
}: {
  searchParams: Promise<{ team?: string }>;
}) {
  const { team } = await searchParams;
  await requireAdmin();
  const supabase = await createClient();
  const { data } = await supabase
    .from("teams")
    .select("*")
    .order("name");

  return (
    <>
      <PageHeader
        title="Nuevo jugador"
        description="El nombre y apellido deben coincidir con los que usará al registrarse."
      />
      <PlayerForm teams={(data ?? []) as Team[]} defaultTeamId={team} />
    </>
  );
}
