import type { Metadata } from "next";
import { NewsForm } from "@/components/news/news-form";
import { PageHeader } from "@/components/page-header";
import { requireCoach } from "@/lib/auth";

export const metadata: Metadata = { title: "Nueva noticia" };

export default async function NewNewsPage() {
  const session = await requireCoach();

  return (
    <>
      <PageHeader
        title="Nueva noticia"
        description="Portada, título y texto. Se verá en el tablón para todo el club."
      />
      <NewsForm userId={session.id} />
    </>
  );
}
