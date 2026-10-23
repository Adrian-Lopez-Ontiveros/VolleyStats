import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { newsExcerpt } from "@/lib/news";
import { cn } from "@/lib/utils";
import type { ClubNews } from "@/lib/types";

export function NewsCard({
  news,
  featured = false,
  className,
  footer,
}: {
  news: ClubNews;
  featured?: boolean;
  className?: string;
  /** Reacciones y comentarios: van fuera del enlace para poder tocarse sin abrir la noticia. */
  footer?: React.ReactNode;
}) {
  const dateLabel = format(new Date(news.published_at), "d MMM yyyy", { locale: es });

  return (
    <article
      className={cn(
        "flex h-full min-w-0 w-full max-w-full flex-col overflow-hidden rounded-3xl border bg-card shadow-card",
        featured && "ring-1 ring-accent/30",
        className
      )}
    >
      <Link href={`/noticias/${news.id}`} className="block min-w-0 flex-1 transition-transform active:scale-[0.99]">
        <div className="min-w-0 bg-primary">
          {news.cover_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={news.cover_url} alt="" className="block h-auto w-full" />
          ) : (
            <div className="aspect-[16/9] bg-gradient-to-br from-primary via-primary to-accent/70" />
          )}
        </div>
        <div className={cn("space-y-2", featured ? "p-5" : "p-4")}>
          <span className="inline-flex rounded-full bg-accent px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent-foreground">
            {dateLabel}
          </span>
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
      </Link>
      {footer}
    </article>
  );
}
