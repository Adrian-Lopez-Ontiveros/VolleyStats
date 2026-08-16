import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TeamForm } from "@/components/teams/team-form";
import { PageHeader } from "@/components/page-header";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Team } from "@/lib/types";

export const metadata: Metadata = { title: "Editar equipo" };

export default async function EditTeamPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireAdmin();
  const supabase = await createClient();
  const { data: team } = await supabase
    .from("teams")
    .select("id, name, short_name, logo_url, city, category, is_club_team")
    .eq("id", id)
    .maybeSingle();
  if (!team) notFound();

  return (
    <>
      <PageHeader title="Editar equipo" />
      <TeamForm team={team as Team} />
    </>
  );
}
