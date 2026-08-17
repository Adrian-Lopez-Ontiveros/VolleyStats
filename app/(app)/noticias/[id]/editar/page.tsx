import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NewsForm } from "@/components/news/news-form";
import { PageHeader } from "@/components/page-header";
import { requireAdmin } from "@/lib/auth";
import { NEWS_SELECT } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import type { ClubNews } from "@/lib/types";

export const metadata: Metadata = { title: "Editar noticia" };

export default async function EditNewsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireAdmin();
  const supabase = await createClient();
  const { data } = await supabase
    .from("news")
    .select(NEWS_SELECT as "*")
    .eq("id", id)
    .maybeSingle();

  if (!data) notFound();

  return (
    <>
      <PageHeader title="Editar noticia" />
      <NewsForm news={data as ClubNews} userId={session.id} />
    </>
  );
}
