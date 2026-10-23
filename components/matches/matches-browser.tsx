"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { CategoryNav } from "@/components/category-nav";
import { FmvLeagueSearch } from "@/components/matches/fmv-league-search";
import { JornadaBar } from "@/components/matches/jornada-bar";
import { LeagueStandings } from "@/components/matches/league-standings";
import { MatchViews } from "@/components/matches/match-views";
import { AppLogo } from "@/components/app-logo";
import { PageHeader } from "@/components/page-header";
import { QueryError } from "@/components/query-error";
import { Button } from "@/components/ui/button";
import {
  clearPartidosReturn,
  peekPartidosScroll,
  rememberPartidosHref,
  rememberPartidosScroll,
} from "@/components/matches/partidos-return";
import { getCategoryMeta, type TeamCategory } from "@/lib/categories";
import {
  currentJornadaNumber,
  federationRoundNumber,
  isCategoryMatch,
  jornadaViewMatches,
  standingsThroughJornada,
} from "@/lib/federation/rounds";
import {
  buildPartidosHref,
  type PartidosListView,
  type PartidosPanel,
  resolvePartidosView,
} from "@/lib/partidos-view";
import type { MatchWithTeams } from "@/lib/types";

export function MatchesBrowser({
  matches,
  canManage,
  isGuest = false,
  initialCategory,
  initialJornada,
  initialPanel,
  initialListView,
  loadError,
}: {
  matches: MatchWithTeams[];
  canManage: boolean;
  isGuest?: boolean;
  initialCategory: TeamCategory | "all";
  initialJornada: number | null;
  initialPanel: PartidosPanel;
  initialListView: PartidosListView;
  loadError?: string;
}) {
  // La URL real manda sobre las props: al volver atrás, Next puede reutilizar el payload
  // del servidor de la primera carga (p. ej. ?categoria=all) aunque la URL ya diga otra cosa,
  // porque los cambios de categoría/jornada solo tocan la URL, sin ir al servidor.
  const [fromUrl] = useState(() => {
    if (typeof window === "undefined") return null;
    const params = new URLSearchParams(window.location.search);
    if (!params.has("categoria")) return null;
    return resolvePartidosView(
      {
        categoria: params.get("categoria") ?? undefined,
        jornada: params.get("jornada") ?? undefined,
        panel: params.get("panel") ?? undefined,
        vista: params.get("vista") ?? undefined,
      },
      null,
      matches
    );
  });
  const [categoria, setCategoria] = useState(fromUrl?.category ?? initialCategory);
  const [panel, setPanel] = useState<PartidosPanel>(fromUrl?.panel ?? initialPanel);
  const [jornada, setJornada] = useState<number | null>(
    fromUrl ? fromUrl.jornada : initialJornada
  );
  const [listView, setListView] = useState<PartidosListView>(fromUrl?.listView ?? initialListView);
  const placeSignature = `${initialCategory}|${initialJornada ?? ""}|${initialPanel}|${initialListView}`;
  const seenPlace = useRef(placeSignature);
  // Firmas que hemos escrito nosotros en la URL. Si el servidor responde tarde con
  // una de ellas (eco de una navegación antigua), no debe pisar la elección actual.
  const localPlaces = useRef(new Set<string>([placeSignature]));
  // Jornada elegida a mano en esta visita (compartida entre ligas). undefined = no eligió.
  // Solo vive en el componente: al salir de Partidos se pierde.
  const manualJornada = useRef<number | null | undefined>(undefined);
  const leagueCategory = categoria === "all" ? null : categoria;
  const categoryMatches = useMemo(
    () =>
      leagueCategory
        ? matches.filter(
            (match) =>
              match.home_team.category === leagueCategory ||
              match.away_team.category === leagueCategory
          )
        : [],
    [matches, leagueCategory]
  );
  const liveMatches = useMemo(
    () => matches.filter((match) => match.status === "live"),
    [matches]
  );
  // Al elegir jornada se ven también los partidos adelantados/atrasados que se juegan
  // esa semana (marcados). La clasificación sigue contando por número de jornada.
  const { matches: visibleMatches, notes: matchNotes } = useMemo(() => {
    if (jornada == null) return { matches: categoryMatches, notes: {} as Record<string, string> };
    return jornadaViewMatches(
      categoryMatches.filter((match) => Boolean(match.is_federation)),
      jornada
    );
  }, [categoryMatches, jornada]);
  const standings = useMemo(
    () =>
      leagueCategory
        ? standingsThroughJornada(categoryMatches, leagueCategory, jornada)
        : null,
    [categoryMatches, leagueCategory, jornada]
  );

  useEffect(() => {
    if (seenPlace.current === placeSignature) return;
    seenPlace.current = placeSignature;
    if (localPlaces.current.delete(placeSignature)) return;
    setCategoria(initialCategory);
    setJornada(initialJornada);
    setPanel(initialPanel);
    setListView(initialListView);
  }, [placeSignature, initialCategory, initialJornada, initialPanel, initialListView]);

  useLayoutEffect(() => {
    const y = peekPartidosScroll();
    if (y == null) return;
    if (y >= 1) window.scrollTo(0, y);
    const timer = window.setTimeout(clearPartidosReturn, 1500);
    return () => window.clearTimeout(timer);
  }, []);

  useLayoutEffect(() => {
    const href = buildPartidosHref({
      category: categoria,
      jornada,
      panel,
      listView,
    });
    rememberPartidosHref(href);
    localPlaces.current.add(`${categoria}|${jornada ?? ""}|${panel}|${listView}`);
    const here = `${window.location.pathname}${window.location.search}`;
    if (here !== href) {
      // Solo cambia la URL: los partidos ya están en el cliente, así que no hace falta
      // navegar al servidor (eso re-suspendía partidos/loading.tsx y devolvía el scroll arriba).
      // Next 15 integra history.replaceState con su router si el state no es suyo (null),
      // así useSearchParams y router.back() desde un partido ven esta URL exacta.
      window.history.replaceState(null, "", href);
    }
  }, [categoria, jornada, panel, listView]);

  useEffect(() => {
    rememberPartidosScroll(window.scrollY);
    const onScroll = () => rememberPartidosScroll(window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function selectCategory(next: TeamCategory | "all") {
    setPanel("catalog");
    if (next === categoria) return;
    setCategoria(next);
    if (next === "all") {
      setJornada(null);
      return;
    }
    // Si ya eligió jornada a mano en esta visita, la otra liga abre en ese mismo número
    // (ajustado a sus jornadas). Si no, la de esta semana. Al salir de Partidos se olvida.
    const manual = manualJornada.current;
    setJornada(
      manual === undefined
        ? currentJornadaNumber(matches, next)
        : clampJornada(manual, leagueRounds(matches, next))
    );
  }

  function chooseJornada(next: number | null) {
    manualJornada.current = next;
    setJornada(next);
  }

  const description =
    panel === "live"
      ? "Partidos con seguimiento en vivo en la app, de cualquier liga."
      : leagueCategory
        ? `${getCategoryMeta(leagueCategory).label}. Sin jornada ves el calendario y la clasificación actual. Al elegir una, ves sus partidos y la tabla al terminarla.`
        : "Elige una liga de fmvoley con los desplegables. Las tres ligas del club siguen en sus pestañas.";

  return (
    <>
      <PageHeader
        title="Partidos"
        description={description}
        leading={<AppLogo src="/partidos-logo.png" className="mt-0.5 h-11 w-14 text-foreground" />}
        action={
          canManage ? (
            <Button asChild variant="accent" size="sm">
              <Link href="/partidos/nuevo">
                <Plus className="h-4 w-4" />
                Nuevo
              </Link>
            </Button>
          ) : null
        }
      />

      {!isGuest ? (
        <Link
          href="/predicciones"
          className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-950 dark:border-orange-400/40 dark:bg-orange-500/15 dark:text-orange-50"
        >
          <span>
            <span className="font-semibold text-orange-800 dark:text-orange-100">Predice la jornada.</span>{" "}
            <span className="text-orange-900/80 dark:text-orange-100/80">Elige ganador y suma XP si aciertas.</span>
          </span>
          <span className="shrink-0 font-bold text-orange-700 dark:text-orange-200">Predecir →</span>
        </Link>
      ) : null}

      <button
        type="button"
        onClick={() => setPanel("live")}
        className={`mb-3 w-full rounded-xl px-3 py-2.5 text-center leading-tight ${
          panel === "live"
            ? "bg-orange-500 text-white shadow-sm"
            : "bg-secondary text-muted-foreground"
        }`}
      >
        <span className="block text-sm font-semibold">Partido en directo</span>
        <span className="block text-[11px] font-medium opacity-80">
          Seguimiento en vivo de cualquier liga
        </span>
      </button>

      <CategoryNav
        basePath="/partidos"
        value={categoria}
        allowAll
        suspended={panel === "live"}
        onChange={selectCategory}
      />

      {loadError ? (
        <QueryError message={`No se pudieron cargar los partidos: ${loadError}`} />
      ) : null}

      {panel === "live" ? (
        <MatchViews
          matches={liveMatches}
          view={listView}
          onViewChange={setListView}
          empty="Ahora mismo no hay ningún partido con seguimiento en vivo."
        />
      ) : leagueCategory ? (
        <>
          <JornadaBar value={jornada} onChange={chooseJornada} />
          <MatchViews
            matches={visibleMatches}
            notes={matchNotes}
            view={listView}
            onViewChange={setListView}
            empty={
              jornada == null
                ? "Todavía no hay partidos."
                : "No hay partidos en esta jornada."
            }
          />
          {standings ? (
            <LeagueStandings
              jornada={jornada}
              rows={standings.rows}
              unfinished={standings.unfinished}
            />
          ) : null}
        </>
      ) : (
        <FmvLeagueSearch />
      )}
    </>
  );
}


function leagueRounds(matches: readonly MatchWithTeams[], category: TeamCategory): number[] {
  const rounds = new Set<number>();
  for (const match of matches) {
    if (!match.is_federation || !isCategoryMatch(match, category)) continue;
    const round = federationRoundNumber(match.federation_round);
    if (round != null) rounds.add(round);
  }
  return [...rounds].sort((a, b) => a - b);
}

/** Mismo número de jornada en otra liga; si no existe, la más cercana de esa liga. */
function clampJornada(jornada: number | null, rounds: number[]): number | null {
  if (jornada == null || rounds.length === 0) return jornada;
  if (rounds.includes(jornada)) return jornada;
  return rounds.reduce((best, round) =>
    Math.abs(round - jornada) < Math.abs(best - jornada) ? round : best
  );
}
