import type { Metadata } from "next";
import Link from "next/link";
import { Newspaper, Plus, Target } from "lucide-react";
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
  const { canManage, isGuest } = await requireViewer();
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
          canManage ? (
            <Button asChild variant="accent" size="sm">
              <Link href="/noticias/nuevo">
                <Plus className="h-4 w-4" />
                Nueva
              </Link>
            </Button>
          ) : null
        }
      />

      <Link
        href="/predicciones"
        className="mb-5 flex items-center justify-between gap-3 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm"
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-500 text-white">
            <Target className="h-4 w-4" />
          </span>
          <span>
            <span className="font-semibold text-orange-800">Predice la jornada.</span>{" "}
            <span className="text-orange-900/80">
              {isGuest ? "Entra con cuenta para elegir ganador." : "Elige ganador y suma puntos."}
            </span>
          </span>
        </span>
        <span className="shrink-0 font-bold text-orange-700">
          {isGuest ? "Entrar →" : "Predecir →"}
        </span>
      </Link>

      {items.length === 0 ? (
        <EmptyState
          icon={Newspaper}
          title="Todavía no hay noticias"
          description={
            canManage
              ? "Publica el primer anuncio del club: convocatoria, resultado o aviso."
              : "Cuando haya novedades del club aparecerán aquí."
          }
          action={
            canManage ? (
              <Button asChild variant="accent">
                <Link href="/noticias/nuevo">Escribir noticia</Link>
              </Button>
            ) : null
          }
        />
      ) : (
        <div className="mx-auto w-full min-w-0 max-w-5xl">
          <div className={rest.length > 0 ? "grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-2" : "min-w-0"}>
            <NewsCard
              news={featured}
              featured
              className={rest.length > 0 ? "lg:col-span-2" : undefined}
            />
            {rest.map((item) => (
              <NewsCard key={item.id} news={item} />
            ))}
          </div>
        </div>
      )}
    </>
  );
}
