import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  CalendarClock,
  Check,
  ChevronRight,
  Flame,
  MapPin,
  Medal,
  Newspaper,
  Target,
  Trophy,
} from "lucide-react";
import { Countdown } from "@/components/hoy/countdown";
import { NewsCard } from "@/components/news/news-card";
import { NewsCardSocial } from "@/components/news/news-social";
import { TeamLogo } from "@/components/teams/team-logo";
import { DAILY_CHALLENGES } from "@/lib/game";
import type { HoyData, HoyMatch } from "@/lib/hoy-types";
import { cn } from "@/lib/utils";

function greeting(now: Date) {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Madrid", hour: "2-digit", hour12: false }).format(now)
  );
  if (hour < 6) return "Buenas noches";
  if (hour < 14) return "Buenos días";
  if (hour < 21) return "Buenas tardes";
  return "Buenas noches";
}

function Block({
  title,
  icon,
  href,
  hrefLabel,
  children,
  className,
}: {
  title: string;
  icon: React.ReactNode;
  href?: string;
  hrefLabel?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-3xl border bg-card p-4 shadow-card", className)}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
          {icon}
          {title}
        </h2>
        {href ? (
          <Link href={href} className="inline-flex items-center text-xs font-semibold text-primary hover:underline">
            {hrefLabel ?? "Ver"}
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function Teams({ match, size = "md" }: { match: HoyMatch; size?: "sm" | "md" }) {
  const finished = match.status === "finished";
  return (
    <div className="flex items-center gap-3">
      <div className="flex min-w-0 flex-1 flex-col items-center gap-1 text-center">
        <TeamLogo
          name={match.home.name}
          shortName={match.home.shortName}
          logoUrl={match.home.logoUrl}
          federationTeamId={match.home.federationTeamId}
          size={size}
        />
        <span className={cn("line-clamp-2 text-xs leading-tight", match.home.isClub && "font-bold")}>
          {match.home.name}
        </span>
      </div>
      <div className="shrink-0 text-center">
        {finished ? (
          <span className="text-2xl font-black tabular-nums">
            {match.homeSets}–{match.awaySets}
          </span>
        ) : (
          <span className="text-sm font-bold text-muted-foreground">vs</span>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col items-center gap-1 text-center">
        <TeamLogo
          name={match.away.name}
          shortName={match.away.shortName}
          logoUrl={match.away.logoUrl}
          federationTeamId={match.away.federationTeamId}
          size={size}
        />
        <span className={cn("line-clamp-2 text-xs leading-tight", match.away.isClub && "font-bold")}>
          {match.away.name}
        </span>
      </div>
    </div>
  );
}

/** Dónde se completa cada reto. «Entrar» ya se cumple al abrir la app: sin enlace. */
function challengeHref(id: string, data: HoyData): string | null {
  switch (id) {
    case "predecir":
      return data.predictions?.firstMissingId
        ? `/predicciones#pred-${data.predictions.firstMissingId}`
        : "/predicciones";
    case "comentar":
      return data.news ? `/noticias/${data.news.id}#comentarios` : "/noticias";
    case "exacto":
      return "/predicciones";
    default:
      return null;
  }
}

function ResultPill({ won }: { won: boolean | null }) {
  if (won == null) return null;
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[11px] font-bold",
        won
          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200"
          : "bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-200"
      )}
    >
      {won ? "Victoria" : "Derrota"}
    </span>
  );
}

export function HoyView({ data, now = new Date() }: { data: HoyData; now?: Date }) {
  const next = data.nextMatch;
  const today = format(now, "EEEE d 'de' MMMM", { locale: es });
  const challenges =
    data.challenges ??
    DAILY_CHALLENGES.map((c) => ({ ...c, done: false, claimed: false }));
  const challengesDone = challenges.filter((c) => c.claimed || c.done).length;
  const pendingCount =
    (data.predictions?.missing ?? 0) + (data.challenges ? challenges.length - challengesDone : 0);

  return (
    <div className="space-y-4">
      {/* Saludo + racha */}
      <header className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-muted-foreground first-letter:uppercase">{today}</p>
          <h1 className="text-2xl font-black leading-tight tracking-tight text-foreground">
            {greeting(now)}{data.isGuest ? "" : `, ${data.firstName}`}
          </h1>
        </div>
        {data.isGuest ? null : (
        <div className="flex shrink-0 flex-col items-center rounded-2xl border border-orange-200 bg-orange-50 px-3 py-1.5 text-orange-700 dark:border-orange-400/30 dark:bg-orange-500/15 dark:text-orange-200">
          <span className="flex items-center gap-1 text-xl font-black tabular-nums">
            <Flame className="h-5 w-5" aria-hidden />
            {data.streak}
          </span>
          <span className="text-[10px] font-semibold">
            {data.streak === 1 ? "día seguido" : "días seguidos"}
          </span>
        </div>
        )}
      </header>

      {/* Próximo partido */}
      <Block
        title={next?.isToday ? "¡Hoy hay partido!" : "Próximo partido"}
        icon={<CalendarClock className="h-4 w-4" />}
        href="/partidos"
        hrefLabel="Partidos"
        className={cn(
          next?.isToday &&
            "border-primary/50 bg-gradient-to-br from-primary/10 via-card to-accent/15 ring-2 ring-primary/30"
        )}
      >
        {next ? (
          <Link href={`/partidos/${next.id}`} className="block space-y-3">
            <Teams match={next} />
            <div className="flex flex-col items-center gap-1.5 text-center">
              <p className="text-sm font-semibold first-letter:uppercase">
                {next.categoryLabel} · {next.whenLabel}
              </p>
              {next.place ? (
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" aria-hidden />
                  {next.place}
                </p>
              ) : null}
              {next.hasTime || next.status === "live" ? (
                <div className="mt-1 text-sm">
                  <Countdown target={next.scheduledAt} live={next.status === "live"} />
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Hora por confirmar</p>
              )}
            </div>
          </Link>
        ) : (
          <p className="text-sm text-muted-foreground">
            {data.teamName ? "No hay partidos programados de tu equipo." : "Todavía no tienes equipo asignado."}
          </p>
        )}
      </Block>

      {/* Pendiente hoy (solo con cuenta) */}
      {data.isGuest ? (
        <Link
          href="/login"
          className="flex items-center gap-3 rounded-3xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-950 dark:border-orange-400/40 dark:bg-orange-500/15 dark:text-orange-50"
        >
          <Target className="h-5 w-5 shrink-0 text-orange-700 dark:text-orange-200" aria-hidden />
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">¿Eres del club?</span>
            <span className="block text-xs text-orange-900/80 dark:text-orange-100/80">
              Entra con tu cuenta para predicciones, retos diarios y tu racha.
            </span>
          </span>
          <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />
        </Link>
      ) : (
      <Block
        title={pendingCount > 0 ? `Pendiente hoy · ${pendingCount}` : "Pendiente hoy"}
        icon={<Target className="h-4 w-4" />}
      >
        <ul className="space-y-2">
          {data.predictions ? (
            <li>
              <Link
                href={
                  data.predictions.firstMissingId
                    ? `/predicciones#pred-${data.predictions.firstMissingId}`
                    : "/predicciones"
                }
                className={cn(
                  "flex items-center gap-3 rounded-2xl border px-3 py-2.5",
                  data.predictions.missing > 0
                    ? "border-orange-300 bg-orange-50/70 dark:border-orange-400/40 dark:bg-orange-500/15"
                    : "bg-secondary/50"
                )}
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">
                    {data.predictions.missing > 0
                      ? `Te faltan ${data.predictions.missing} ${data.predictions.missing === 1 ? "predicción" : "predicciones"}`
                      : "Predicciones hechas"}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {data.predictions.label} · {data.predictions.open - data.predictions.missing}/
                    {data.predictions.open}
                  </span>
                </span>
                {data.predictions.missing > 0 ? null : <Check className="h-4 w-4 text-emerald-600" />}
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              </Link>
            </li>
          ) : null}
          {challenges.map((challenge) => {
            const complete = challenge.claimed || challenge.done;
            const href = challengeHref(challenge.id, data);
            const rowClass = cn(
              "flex items-center gap-3 rounded-2xl border px-3 py-2.5",
              complete ? "bg-secondary/50" : "bg-card",
              href && "transition-colors hover:bg-secondary/70 active:scale-[0.99]"
            );
            const content = (
              <>
                <span
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border",
                    complete ? "border-emerald-500 bg-emerald-500 text-white" : "border-muted-foreground/40"
                  )}
                  aria-hidden
                >
                  {complete ? <Check className="h-3.5 w-3.5" /> : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={cn("block text-sm font-semibold", complete && "text-muted-foreground line-through")}>
                    {challenge.label}
                  </span>
                  <span className="block text-xs text-muted-foreground">{challenge.hint}</span>
                </span>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums",
                    complete
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200"
                      : "bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-200"
                  )}
                >
                  +{challenge.xp} XP
                </span>
                {href ? <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden /> : null}
              </>
            );
            return (
              <li key={challenge.id}>
                {href ? (
                  <Link href={href} className={rowClass}>
                    {content}
                  </Link>
                ) : (
                  <div className={rowClass}>{content}</div>
                )}
              </li>
            );
          })}
        </ul>
        {data.challenges == null ? (
          <p className="mt-2 text-xs text-muted-foreground">Los retos diarios se activan muy pronto.</p>
        ) : data.challengesXpToday > 0 ? (
          <p className="mt-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
            +{data.challengesXpToday} XP ganados con los retos ahora mismo
          </p>
        ) : null}
      </Block>
      )}

      {/* Última noticia: misma tarjeta, ancho y proporción de imagen que la destacada de /noticias */}
      {data.news ? (
        <div className="mx-auto w-full min-w-0 max-w-5xl">
          {data.news.item ? (
            <NewsCard
              news={data.news.item}
              featured
              footer={
                data.news.social ? (
                  <NewsCardSocial newsId={data.news.id} social={data.news.social} loggedIn={!data.isGuest} />
                ) : null
              }
            />
          ) : (
            <article className="min-w-0 overflow-hidden rounded-3xl border bg-card shadow-card">
              <Link href={`/noticias/${data.news.id}`} className="block">
                {data.news.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={data.news.coverUrl} alt="" className="block h-auto w-full bg-primary" />
                ) : (
                  <div className="aspect-[16/9] bg-gradient-to-br from-primary via-primary to-accent/70" />
                )}
                <div className="p-5">
                  <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    <Newspaper className="h-3.5 w-3.5" /> Última noticia
                  </p>
                  <p className="mt-1 line-clamp-2 text-2xl font-bold leading-tight text-foreground">{data.news.title}</p>
                  <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">{data.news.excerpt}</p>
                </div>
              </Link>
              {data.news.social ? (
                <NewsCardSocial newsId={data.news.id} social={data.news.social} loggedIn={!data.isGuest} />
              ) : null}
            </article>
          )}
        </div>
      ) : null}

      {/* Último partido */}
      {data.lastMatch ? (
        <Block
          title="Último partido"
          icon={<Trophy className="h-4 w-4" />}
          href={`/partidos/${data.lastMatch.id}`}
          hrefLabel="Detalle"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <span className="first-letter:uppercase">{data.lastMatch.whenLabel}</span>
              <ResultPill won={data.lastMatch.won} />
            </div>
            <Teams match={data.lastMatch} size="sm" />
            {data.lastMatch.stats ? (
              <div>
                <p className="mb-1.5 text-xs font-semibold text-muted-foreground">Tus números vs tu media</p>
                <div className="grid grid-cols-4 gap-2">
                  {data.lastMatch.stats.map((line) => {
                    const diff = line.value - line.average;
                    return (
                      <div key={line.label} className="rounded-2xl bg-secondary/60 px-2 py-2 text-center">
                        <p className="text-lg font-black tabular-nums">{line.value}</p>
                        <p className="text-[10px] font-semibold text-muted-foreground">{line.label}</p>
                        <p
                          className={cn(
                            "text-[10px] font-bold tabular-nums",
                            diff > 0.05
                              ? "text-emerald-700 dark:text-emerald-300"
                              : diff < -0.05
                                ? "text-rose-700 dark:text-rose-300"
                                : "text-muted-foreground"
                          )}
                        >
                          media {line.average.toLocaleString("es-ES")}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No hay estadísticas tuyas de este partido.</p>
            )}
          </div>
        </Block>
      ) : null}

      {/* Clasificación + resto del club */}
      {data.standing || data.clubResults.length > 0 ? (
        <Block title="Liga y club" icon={<Medal className="h-4 w-4" />} href="/liga" hrefLabel="Liga">
          {data.standing ? (
            <div className="flex items-center gap-3 rounded-2xl bg-secondary/60 px-3 py-2.5">
              <span className="text-3xl font-black tabular-nums text-foreground">{data.standing.position}º</span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">
                  {data.standing.categoryLabel} · de {data.standing.total}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {data.standing.points} pts · {data.standing.played} jugados
                  {data.standing.jornada ? ` · esta semana J${data.standing.jornada}` : ""}
                </span>
              </span>
            </div>
          ) : null}
          {data.clubResults.length > 0 ? (
            <div className={cn(data.standing && "mt-3")}>
              <p className="mb-1.5 text-xs font-semibold text-muted-foreground">
                {data.isGuest ? "Resultados del club el último fin de semana" : "El resto del club ese fin de semana"}
              </p>
              <ul className="divide-y rounded-2xl border">
                {data.clubResults.map((match) => {
                  const clubHome = match.home.isClub;
                  const won = clubHome ? match.homeSets > match.awaySets : match.awaySets > match.homeSets;
                  const rival = clubHome ? match.away.name : match.home.name;
                  return (
                    <li key={match.id}>
                      <Link href={`/partidos/${match.id}`} className="flex items-center gap-2 px-3 py-2 text-sm">
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-semibold">{match.categoryLabel}</span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {clubHome ? "vs" : "en"} {rival}
                          </span>
                        </span>
                        <span className="font-black tabular-nums">
                          {match.homeSets}–{match.awaySets}
                        </span>
                        <ResultPill won={won} />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
        </Block>
      ) : null}
    </div>
  );
}
