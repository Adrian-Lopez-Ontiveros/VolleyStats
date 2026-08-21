import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { NewsCover } from "@/components/news/news-cover";
import { coverFrameFromNews, newsExcerpt } from "@/lib/news";
import { cn } from "@/lib/utils";
import type { ClubNews } from "@/lib/types";

export function NewsCard({
  news,
  featured = false,
  className,
}: {
  news: ClubNews;
  featured?: boolean;
  className?: string;
}) {
  const dateLabel = format(new Date(news.published_at), "d MMM yyyy", { locale: es });

  return (
    <Link href={`/noticias/${news.id}`} className={cn("block h-full min-w-0 w-full max-w-full", className)}>
      <article
        className={cn(
          "h-full min-w-0 overflow-hidden rounded-3xl border bg-card shadow-card transition-transform active:scale-[0.99]",
          featured && "ring-1 ring-accent/30"
        )}
      >
        <div className="relative min-w-0 overflow-hidden">
          <NewsCover
            url={news.cover_url}
            frame={coverFrameFromNews(news)}
            className={cn("aspect-[16/9] w-full", featured && "lg:aspect-[21/9]")}
          />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-primary/80 to-transparent px-4 pb-3 pt-10">
            <span className="inline-flex rounded-full bg-accent px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent-foreground">
              {dateLabel}
            </span>
          </div>
        </div>
        <div className={cn("space-y-2", featured ? "p-5" : "p-4")}>
          <h2
            className={cn(
              "break-words font-bold leading-tight tracking-tight [overflow-wrap:anywhere]",
              featured ? "text-2xl" : "text-lg"
            )}
          >
            {news.title}
          </h2>
          <p className="line-clamp-3 break-words text-sm leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">
            {newsExcerpt(news.body, featured ? 180 : 130)}
          </p>
        </div>
      </article>
    </Link>
  );
}
