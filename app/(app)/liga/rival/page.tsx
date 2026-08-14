import type { Metadata } from "next";
import { TeamForm } from "@/components/teams/team-form";
import { PageHeader } from "@/components/page-header";
import { requireAdmin } from "@/lib/auth";
import { getCategoryMeta, parseCategory } from "@/lib/categories";

export const metadata: Metadata = { title: "Añadir rival" };

export default async function NewRivalPage({
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
        title="Añadir rival"
        description={`Se guardará en la clasificación de ${meta.label}.`}
      />
      <TeamForm defaultCategory={categoria} defaultIsClub={false} lockKind />
    </>
  );
}
