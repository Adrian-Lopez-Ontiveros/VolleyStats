import type { Metadata } from "next";
import { TeamForm } from "@/components/teams/team-form";
import { PageHeader } from "@/components/page-header";
import { requireAdmin } from "@/lib/auth";
import { getCategoryMeta, parseCategory } from "@/lib/categories";

export const metadata: Metadata = { title: "Nuevo equipo del club" };

export default async function NewTeamPage({
  searchParams,
}: {
  searchParams: Promise<{ categoria?: string }>;
}) {
  const { categoria: rawCategory } = await searchParams;
  await requireAdmin();
  const categoria = parseCategory(rawCategory);
  const meta = getCategoryMeta(categoria);

  return (
    <>
      <PageHeader
        title="Equipo del club"
        description={`Crea la plantilla de ${meta.label}. Los rivales se añaden desde Liga.`}
      />
      <TeamForm defaultCategory={categoria} defaultIsClub lockKind />
    </>
  );
}
