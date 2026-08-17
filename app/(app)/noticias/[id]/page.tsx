import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Pencil } from "lucide-react";
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

  return (
    <>
      <div className="mb-3">
        <BackButton href="/noticias" />
      </div>

      <article>
        <NewsCover
          url={news.cover_url}
          frame={coverFrameFromNews(news)}
          className="-mx-4 mb-5 aspect-[16/9] w-[calc(100%+2rem)]"
        />

        <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent">
          {format(new Date(news.published_at), "EEEE d MMMM yyyy", { locale: es })}
        </p>
        <h1 className="mt-2 text-3xl font-black leading-tight tracking-tight">{news.title}</h1>
        <div className="mt-5 whitespace-pre-wrap text-[15px] leading-relaxed text-foreground/90">
          {news.body}
        </div>
      </article>

      {isAdmin ? (
        <div className="mt-8 space-y-2">
          <Button asChild variant="outline" className="w-full">
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
