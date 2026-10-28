// Datos de la pantalla «Hoy» (solo servidor). Reutiliza las consultas de partidos,
// la jornada de esta semana (lib/federation/rounds.ts) y el sistema de XP.
import type { SupabaseClient } from "@supabase/supabase-js";
import { loadDailyChallenges } from "@/lib/actions/game";
import { getCategoryMeta, isTeamCategory } from "@/lib/categories";
import { NEWS_SELECT, PLAYER_SKILL_EVENT_SELECT } from "@/lib/constants";
import { getMatchesList } from "@/lib/data";
import { involvesClubTeam } from "@/lib/federation/leagues";
import {
  currentJornadaNumber,
  madridWeekKey,
  standingsThroughJornada,
} from "@/lib/federation/rounds";
import { formatMatchWhen, formatMatchWhenShort, madridCalendarKey } from "@/lib/federation/schedule";
import { isPredictionLocked, jornadaKeyFromIso, jornadaRangeLabel, nearestJornadaKey } from "@/lib/game";
import type { HoyData, HoyMatch, HoyStatLine } from "@/lib/hoy-types";
import { courtLabel } from "@/lib/match-venue";
import { newsPlainExcerpt } from "@/lib/news";
import { loadNewsSocialMany } from "@/lib/news-social";
import { buildPlayerMatchSeries, type PlayerMatchSample } from "@/lib/stats";
import { readUserProgress } from "@/lib/user-progress";
import type { ClubNews, MatchWithTeams, PointType, SessionUser } from "@/lib/types";

export function toHoyMatch(match: MatchWithTeams, teamId: string | null, now = new Date()): HoyMatch {
  const isHome = teamId != null && match.home_team_id === teamId;
  const isAway = teamId != null && match.away_team_id === teamId;
  const clubHome = Boolean(match.home_team.is_club_team);
  const ownHome = isHome || (!isAway && clubHome);
  const finished = match.status === "finished";
  const category = match.home_team.is_club_team ? match.home_team.category : match.away_team.category;
  return {
    id: match.id,
    home: side(match.home_team),
    away: side(match.away_team),
    scheduledAt: match.scheduled_at,
    whenLabel: formatMatchWhen({
      scheduledAt: match.scheduled_at,
      notes: match.notes,
      isFederation: match.is_federation,
    }),
    hasTime:
      formatMatchWhenShort({
        scheduledAt: match.scheduled_at,
        notes: match.notes,
        isFederation: match.is_federation,
      }) !== "Finde",
    isToday: madridCalendarKey(match.scheduled_at) === madridCalendarKey(now.toISOString()),
    place: [match.location, courtLabel(match.court)].filter(Boolean).join(" · ") || null,
    homeSets: match.home_sets,
    awaySets: match.away_sets,
    status: match.status,
    won: finished
      ? ownHome
        ? match.home_sets > match.away_sets
        : match.away_sets > match.home_sets
      : null,
    categoryLabel: getCategoryMeta(category).label,
  };
}

function side(team: MatchWithTeams["home_team"]) {
  return {
    name: team.name,
    shortName: team.short_name ?? null,
    logoUrl: team.logo_url ?? null,
    federationTeamId: team.federation_team_id ?? null,
    isClub: Boolean(team.is_club_team),
  };
}

const STAT_KEYS: { key: keyof PlayerMatchSample; label: string }[] = [
  { key: "points", label: "Puntos" },
  { key: "attackKills", label: "Remates" },
  { key: "aces", label: "Aces" },
  { key: "blocks", label: "Bloqueos" },
];

export function statLinesFor(series: PlayerMatchSample[], matchId: string): HoyStatLine[] | null {
  const sample = series.find((item) => item.matchId === matchId);
  if (!sample || series.length === 0) return null;
  return STAT_KEYS.map(({ key, label }) => {
    const total = series.reduce((sum, item) => sum + Number(item[key] ?? 0), 0);
    return {
      label,
      value: Number(sample[key] ?? 0),
      average: Math.round((total / series.length) * 10) / 10,
    };
  });
}

export async function loadHoyData(user: SessionUser, supabase: SupabaseClient): Promise<HoyData> {
  const now = new Date();
  const player = user.profile.player;
  const team = user.profile.team ?? null;
  const teamId = team?.id ?? player?.team_id ?? null;
  const category = isTeamCategory(team?.category) ? team.category : null;

  const [matchesResult, progressResult, predsResult, newsResult, eventsResult, challenges] =
    await Promise.all([
      getMatchesList(),
      readUserProgress((columns) =>
        supabase.from("user_progress").select(columns).eq("user_id", user.id).maybeSingle()
      ),
      supabase.from("match_predictions").select("match_id").eq("user_id", user.id),
      supabase
        .from("news")
        .select(NEWS_SELECT as "*")
        .lte("published_at", now.toISOString())
        .order("published_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      player?.id
        ? supabase
            .from("match_events")
            .select(PLAYER_SKILL_EVENT_SELECT as "*")
            .eq("player_id", player.id)
        : Promise.resolve({ data: [] as unknown[] }),
      loadDailyChallenges(),
    ]);

  const matches = ((matchesResult.data ?? []) as MatchWithTeams[]).filter(
    (match) => match.status !== "cancelled"
  );
  const clubMatches = matches.filter(involvesClubTeam);
  const ownMatches = teamId
    ? clubMatches.filter((m) => m.home_team_id === teamId || m.away_team_id === teamId)
    : [];

  const nextRaw =
    ownMatches.find(
      (m) => m.status === "live" || (m.status === "scheduled" && new Date(m.scheduled_at) >= startOfMadridDay(now))
    ) ?? null;
  const lastRaw = [...ownMatches].reverse().find((m) => m.status === "finished") ?? null;

  // Pronósticos pendientes de la jornada más próxima (la única que se puede predecir).
  const predicted = new Set(((predsResult.data ?? []) as { match_id: string }[]).map((row) => row.match_id));
  const nearestKey = nearestJornadaKey(clubMatches);
  const jornadaMatches = nearestKey
    ? clubMatches.filter((m) => jornadaKeyFromIso(m.scheduled_at) === nearestKey)
    : [];
  const openMatches = jornadaMatches.filter(
    (m) => m.status === "scheduled" && !isPredictionLocked(m.scheduled_at, now.getTime())
  );
  const predictions =
    openMatches.length > 0
      ? {
          open: openMatches.length,
          missing: openMatches.filter((m) => !predicted.has(m.id)).length,
          label: jornadaRangeLabel(jornadaMatches.map((m) => m.scheduled_at)),
          firstMissingId: openMatches.find((m) => !predicted.has(m.id))?.id ?? null,
        }
      : null;

  // Estadísticas del último partido frente a su media.
  const events = ((eventsResult.data ?? []) as {
    match_id: string;
    point_type: PointType;
    created_at: string;
    match?: { scheduled_at?: string | null; status?: string | null } | null;
  }[]);
  const series = buildPlayerMatchSeries(events);

  // Clasificación de su equipo con la jornada de esta semana.
  let standing: HoyData["standing"] = null;
  if (category && teamId) {
    const jornada = currentJornadaNumber(matches, category);
    const { rows } = standingsThroughJornada(matches, category, null);
    const row = rows.find((item) => item.team.id === teamId);
    if (row) {
      standing = {
        position: row.position,
        total: rows.length,
        points: row.leaguePoints,
        played: row.played,
        jornada,
        categoryLabel: getCategoryMeta(category).label,
      };
    }
  }

  // Resultados del resto de equipos del club el fin de semana de su último partido
  // (o, sin partido propio, la última semana con resultados del club).
  const lastClubFinished = [...clubMatches].reverse().find((m) => m.status === "finished");
  const weekRef = lastRaw?.scheduled_at ?? lastClubFinished?.scheduled_at ?? null;
  const week = weekRef ? madridWeekKey(weekRef) : null;
  const clubResults = week
    ? clubMatches
        .filter(
          (m) =>
            m.status === "finished" &&
            m.id !== lastRaw?.id &&
            madridWeekKey(m.scheduled_at) === week
        )
        .map((m) => toHoyMatch(m, null, now))
    : [];

  const progress = progressResult.data;
  const news = newsResult.data as ClubNews | null;
  // Reacciones y comentarios de la última noticia (migración 045); sin tabla, no se muestran.
  const newsSocial = news
    ? (
        await loadNewsSocialMany(
          supabase,
          [{ id: news.id, isNewsAuthor: news.created_by === user.id }],
          { userId: user.id, isAdmin: user.profile.role === "admin" }
        )
      ).get(news.id) ?? null
    : null;

  return {
    firstName: (user.profile.full_name || "").trim().split(/\s+/)[0] || "jugador",
    streak: progress?.current_streak ?? 0,
    longestStreak: progress?.longest_streak ?? 0,
    level: progress?.level ?? 1,
    xp: progress?.xp ?? 0,
    teamName: team?.name ?? null,
    nextMatch: nextRaw ? toHoyMatch(nextRaw, teamId, now) : null,
    predictions,
    challenges: challenges?.challenges ?? null,
    challengesXpToday: challenges?.xpGained ?? 0,
    lastMatch: lastRaw
      ? { ...toHoyMatch(lastRaw, teamId, now), stats: statLinesFor(series, lastRaw.id) }
      : null,
    standing,
    clubResults,
    news: news
      ? {
          id: news.id,
          title: news.title,
          excerpt: newsPlainExcerpt(news.body, 110),
          coverUrl: news.cover_url ?? null,
          publishedAt: news.published_at,
          item: news,
          social: newsSocial?.available ? newsSocial : null,
        }
      : null,
  };
}

function startOfMadridDay(now: Date) {
  const key = madridCalendarKey(now.toISOString());
  // Margen amplio: cualquier partido de hoy (Madrid) sigue siendo «próximo» aunque haya empezado.
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d) - 2 * 3600_000);
}

/**
 * «Inicio» para espectadores (sin sesión): solo datos públicos del club. Nada de racha,
 * retos, predicciones ni estadísticas personales.
 */
export async function loadSpectatorHoyData(supabase: SupabaseClient): Promise<HoyData> {
  const now = new Date();
  const [matchesResult, newsResult] = await Promise.all([
    getMatchesList(),
    supabase
      .from("news")
      .select(NEWS_SELECT as "*")
      .lte("published_at", now.toISOString())
      .order("published_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  const clubMatches = ((matchesResult.data ?? []) as MatchWithTeams[])
    .filter((match) => match.status !== "cancelled")
    .filter(involvesClubTeam);

  const nextRaw =
    clubMatches.find(
      (m) => m.status === "live" || (m.status === "scheduled" && new Date(m.scheduled_at) >= startOfMadridDay(now))
    ) ?? null;
  const lastClubFinished = [...clubMatches].reverse().find((m) => m.status === "finished");
  const week = lastClubFinished ? madridWeekKey(lastClubFinished.scheduled_at) : null;
  const clubResults = week
    ? clubMatches
        .filter((m) => m.status === "finished" && madridWeekKey(m.scheduled_at) === week)
        .map((m) => toHoyMatch(m, null, now))
    : [];

  const news = newsResult.data as ClubNews | null;
  const newsSocial = news
    ? (
        await loadNewsSocialMany(supabase, [{ id: news.id, isNewsAuthor: false }], {
          userId: null,
          isAdmin: false,
        })
      ).get(news.id) ?? null
    : null;

  return {
    isGuest: true,
    firstName: "",
    streak: 0,
    longestStreak: 0,
    level: 1,
    xp: 0,
    teamName: null,
    nextMatch: nextRaw ? toHoyMatch(nextRaw, null, now) : null,
    predictions: null,
    challenges: null,
    challengesXpToday: 0,
    lastMatch: null,
    standing: null,
    clubResults,
    news: news
      ? {
          id: news.id,
          title: news.title,
          excerpt: newsPlainExcerpt(news.body, 110),
          coverUrl: news.cover_url ?? null,
          publishedAt: news.published_at,
          item: news,
          social: newsSocial?.available ? newsSocial : null,
        }
      : null,
  };
}
