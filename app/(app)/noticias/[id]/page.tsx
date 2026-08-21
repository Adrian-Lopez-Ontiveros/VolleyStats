import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarDays, Pencil } from "lucide-react";
import { BackButton } from "@/components/back-button";
import { DeleteNewsButton } from "@/components/news/delete-news-button";
import { NewsCover } from "@/components/news/news-cover";
import { Button } from "@/components/ui/button";
import { requireViewer } from "@/lib/auth";
import { NEWS_SELECT } from "@/lib/constants";
import { coverFrameFromNews } from "@/lib/news";
import { createClient } from "@/lib/supabase/server";
import type { ClubNews } from "@/lib/types";

export const metadata: Metadata = { title: "Noticia" };

export default async function NewsDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { isAdmin } = await requireViewer();
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
        <div className="overflow-hidden rounded-3xl shadow-card ring-1 ring-black/[0.06]">
          <NewsCover
            url={news.cover_url}
            frame={coverFrameFromNews(news)}
            alt={news.title}
            className="aspect-[4/3] w-full sm:aspect-[16/9]"
          />
        </div>

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

      {isAdmin ? (
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
