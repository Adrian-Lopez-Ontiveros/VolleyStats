import type { Metadata } from "next";
import Link from "next/link";
import { Newspaper, Plus } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { NewsCard } from "@/components/news/news-card";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { QueryError } from "@/components/query-error";
import { requireViewer } from "@/lib/auth";
import { NEWS_SELECT } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import type { ClubNews } from "@/lib/types";

export const metadata: Metadata = { title: "Noticias" };

export default async function NewsPage() {
  const { isAdmin } = await requireViewer();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("news")
    .select(NEWS_SELECT as "*")
    .order("published_at", { ascending: false });

  if (error && /news/i.test(error.message)) {
    return (
      <QueryError message="Falta ejecutar la migración supabase/migrations/018_news.sql en Supabase." />
    );
  }
  if (error) {
    return <QueryError message={`No se pudieron cargar las noticias: ${error.message}`} />;
  }

  const items = (data ?? []) as ClubNews[];
  const [featured, ...rest] = items;

  return (
    <>
      <PageHeader
        title="Noticias"
        description="Tablón de anuncios y novedades del club."
        action={
          isAdmin ? (
            <Button asChild variant="accent" size="sm">
              <Link href="/noticias/nuevo">
                <Plus className="h-4 w-4" />
                Nueva
              </Link>
            </Button>
          ) : null
        }
      />

      {items.length === 0 ? (
        <EmptyState
          icon={Newspaper}
          title="Todavía no hay noticias"
          description={
            isAdmin
              ? "Publica el primer anuncio del club: convocatoria, resultado o aviso."
              : "Cuando haya novedades del club aparecerán aquí."
          }
          action={
            isAdmin ? (
              <Button asChild variant="accent">
                <Link href="/noticias/nuevo">Escribir noticia</Link>
              </Button>
            ) : null
          }
        />
      ) : (
        <div className="space-y-5">
          <NewsCard news={featured} featured />
          {rest.map((item) => (
            <NewsCard key={item.id} news={item} />
          ))}
        </div>
      )}
    </>
  );
}
