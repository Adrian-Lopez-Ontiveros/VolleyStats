import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarDays, Pencil } from "lucide-react";
import { BackButton } from "@/components/back-button";
import { DeleteNewsButton } from "@/components/news/delete-news-button";
import { Button } from "@/components/ui/button";
import { requireViewer } from "@/lib/auth";
import { NEWS_SELECT } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import type { ClubNews } from "@/lib/types";

export const metadata: Metadata = { title: "Noticia" };

export default async function NewsDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { canManage } = await requireViewer();
  const supabase = await createClient();
  const { data } = await supabase
    .from("news")
    .select(NEWS_SELECT as "*")
    .eq("id", id)
    .maybeSingle();

  if (!data) notFound();
  const news = data as ClubNews;
  const publishedLabel = format(new Date(news.published_at), "EEEE, d 'de' MMMM 'de' yyyy", {
    locale: es,
  });

  return (
    <>
      <div className="mb-4">
        <BackButton href="/noticias" />
      </div>

      <article className="min-w-0 lg:grid lg:grid-cols-2 lg:items-start lg:gap-8">
        <figure className="-mx-4 w-[calc(100%+2rem)] lg:mx-0 lg:w-full">
          {news.cover_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={news.cover_url}
              alt={news.title}
              className="mx-auto block h-auto max-h-[85dvh] w-auto max-w-full lg:rounded-3xl lg:shadow-card lg:ring-1 lg:ring-black/[0.06]"
            />
          ) : (
            <div className="aspect-[16/9] bg-gradient-to-br from-primary via-primary to-accent/70 lg:rounded-3xl" />
          )}
        </figure>

        <div className="mt-6 rounded-3xl border bg-card px-5 py-6 shadow-card sm:px-7 sm:py-8 lg:mt-0">
          <header>
            <span className="mb-3 block h-1 w-9 rounded-full bg-accent" aria-hidden />
            <p className="flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
              <time dateTime={news.published_at} className="first-letter:uppercase">
                {publishedLabel}
              </time>
            </p>
            <h1 className="mt-3 break-words text-[1.85rem] font-black leading-[1.15] tracking-tight text-primary [overflow-wrap:anywhere] sm:mt-4 sm:text-4xl">
              {news.title}
            </h1>
          </header>

          <div
            className="mt-6 whitespace-pre-wrap break-words border-t border-border/80 pt-6 text-[16.5px] leading-[1.85] text-foreground/85 [overflow-wrap:anywhere] sm:mt-7 sm:pt-7"
          >
            {news.body}
          </div>
        </div>
      </article>

      {canManage ? (
        <div className="mt-8 space-y-2 sm:mt-10 lg:flex lg:max-w-lg lg:gap-2 lg:space-y-0">
          <Button asChild variant="outline" className="w-full lg:flex-1">
            <Link href={`/noticias/${id}/editar`}>
              <Pencil className="h-4 w-4" />
              Editar
            </Link>
          </Button>
          <DeleteNewsButton newsId={id} />
        </div>
      ) : null}
    </>
  );
}
