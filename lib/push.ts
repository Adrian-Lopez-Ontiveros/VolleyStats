// Envío de notificaciones push en servidor (no es una server action: no exportar a cliente).
import type { SupabaseClient } from "@supabase/supabase-js";
import { getCategoryMeta } from "@/lib/categories";
import { federationRoundNumber } from "@/lib/federation/rounds";
import { formatMatchWhenShort } from "@/lib/federation/schedule";
import { courtLabel } from "@/lib/match-venue";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { unwrapOne } from "@/lib/utils";

export const NOTIFY_PREF_KEYS = [
  "notify_league_results",
  "notify_news",
  "notify_match_reminder",
  "notify_team_stats",
] as const;
export type NotifyPrefKey = (typeof NOTIFY_PREF_KEYS)[number];

export async function pushDb(): Promise<SupabaseClient> {
  return (createServiceClient() ?? (await createClient())) as SupabaseClient;
}

/**
 * Helper común: envía a los usuarios con la preferencia `pref` activada **y** con
 * suscripción push (el interruptor maestro). `onlyUserIds` acota aún más el público.
 */
export async function sendPushToPref(
  supabase: SupabaseClient,
  pref: NotifyPrefKey,
  message: { title: string; body: string; url: string },
  onlyUserIds?: readonly string[]
) {
  if (onlyUserIds && onlyUserIds.length === 0) return { sent: 0 };
  let query = supabase.from("profiles").select("id").eq(pref, true);
  if (onlyUserIds) query = query.in("id", [...onlyUserIds]);
  const { data: profiles, error } = await query;
  if (error) return { sent: 0, error: error.message };
  const ids = ((profiles ?? []) as { id: string }[]).map((row) => row.id);
  if (ids.length === 0) return { sent: 0 };

  const { data: subscriptions } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .in("user_id", ids);

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey || !subscriptions?.length) return { sent: 0 };

  try {
    const webpush = await import("web-push");
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || "mailto:admin@fuenlastats.local",
      publicKey,
      privateKey
    );
    await Promise.all(
      (subscriptions as { endpoint: string; p256dh: string; auth: string }[]).map((sub) =>
        webpush
          .sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            JSON.stringify(message)
          )
          .catch(() => null)
      )
    );
    return { sent: subscriptions.length };
  } catch {
    return { sent: 0 };
  }
}

type TeamRow = {
  id?: string;
  name?: string;
  short_name?: string | null;
  category?: string | null;
  is_club_team?: boolean;
};

const MATCH_NOTIFY_SELECT =
  "id, home_team_id, away_team_id, home_sets, away_sets, set_scores, federation_round, is_federation, location, court, home_team:teams!matches_home_team_id_fkey(id, name, short_name, category, is_club_team), away_team:teams!matches_away_team_id_fkey(id, name, short_name, category, is_club_team)";

type MatchNotifyRow = {
  id: string;
  home_team_id: string;
  away_team_id: string;
  home_sets: number;
  away_sets: number;
  set_scores: { home: number; away: number }[] | null;
  federation_round: string | null;
  is_federation: boolean | null;
  home_team: TeamRow | TeamRow[] | null;
  away_team: TeamRow | TeamRow[] | null;
};

/** Usuarios vinculados a unos equipos: jugador (profiles.team_id / players.team_id) o entrenador. */
async function usersOfTeams(supabase: SupabaseClient, teamIds: string[]) {
  if (teamIds.length === 0) return [];
  const list = teamIds.join(",");
  const [profiles, players] = await Promise.all([
    supabase.from("profiles").select("id").or(`team_id.in.(${list}),coached_team_id.in.(${list})`),
    supabase.from("players").select("user_id").in("team_id", teamIds).not("user_id", "is", null),
  ]);
  const ids = new Set<string>();
  for (const row of (profiles.data ?? []) as { id: string }[]) ids.add(row.id);
  for (const row of (players.data ?? []) as { user_id: string | null }[]) {
    if (row.user_id) ids.add(row.user_id);
  }
  return [...ids];
}

/** Usuarios de la misma liga (categoría) o de alguno de los dos equipos. */
async function usersOfLeague(supabase: SupabaseClient, match: MatchNotifyRow) {
  const home = unwrapOne(match.home_team);
  const away = unwrapOne(match.away_team);
  const categories = [home?.category, away?.category].filter((c): c is string => Boolean(c));
  const teamIds = new Set([match.home_team_id, match.away_team_id]);
  if (categories.length > 0) {
    const { data } = await supabase.from("teams").select("id").in("category", categories);
    for (const row of (data ?? []) as { id: string }[]) teamIds.add(row.id);
  }
  return usersOfTeams(supabase, [...teamIds]);
}

function teamName(team: TeamRow | null | undefined, fallback: string) {
  return team?.short_name || team?.name || fallback;
}

/** Reclama la marca (columna null -> now()) de forma atómica. true si este proceso la ganó. */
async function claimMatchFlag(
  supabase: SupabaseClient,
  matchId: string,
  column: "result_notified_at" | "stats_published_at"
) {
  const { data, error } = await supabase
    .from("matches")
    .update({ [column]: new Date().toISOString() })
    .eq("id", matchId)
    .is(column, null)
    .select("id");
  if (error) return false; // p. ej. falta la migración 042: no enviar
  return (data ?? []).length > 0;
}

async function loadMatch(supabase: SupabaseClient, matchId: string) {
  const { data } = await supabase.from("matches").select(MATCH_NOTIFY_SELECT).eq("id", matchId).maybeSingle();
  return (data as MatchNotifyRow | null) ?? null;
}

/** «Resultados de mi liga»: una sola vez por partido (result_notified_at). */
export async function notifyLeagueResult(supabase: SupabaseClient, matchId: string) {
  if (!(await claimMatchFlag(supabase, matchId, "result_notified_at"))) return { sent: 0 };
  const match = await loadMatch(supabase, matchId);
  if (!match) return { sent: 0 };
  const home = unwrapOne(match.home_team);
  const away = unwrapOne(match.away_team);
  const category = getCategoryMeta(home?.category ?? away?.category).label;
  const round = federationRoundNumber(match.federation_round);
  const league = match.is_federation ? `Liga FMV${round ? ` J${round}` : ""}` : "Amistoso";
  const partials = (match.set_scores ?? []).map((set) => `${set.home}-${set.away}`).join(", ");
  const title = `Final: ${teamName(home, "Local")} ${match.home_sets}–${match.away_sets} ${teamName(away, "Visitante")}`;
  const body = [category, league, partials].filter(Boolean).join(" · ");
  const recipients = await usersOfLeague(supabase, match);
  return sendPushToPref(
    supabase,
    "notify_league_results",
    { title, body, url: `/partidos/${matchId}` },
    recipients
  );
}

/**
 * «Estadísticas de mi equipo»: solo jugadores y entrenadores de los equipos del club que
 * jugaron el partido, una sola vez (stats_published_at).
 */
export async function notifyTeamStats(supabase: SupabaseClient, matchId: string) {
  const match = await loadMatch(supabase, matchId);
  if (!match) return { sent: 0 };
  const home = unwrapOne(match.home_team);
  const away = unwrapOne(match.away_team);
  const clubTeamIds = [
    home?.is_club_team ? match.home_team_id : null,
    away?.is_club_team ? match.away_team_id : null,
  ].filter((id): id is string => Boolean(id));
  if (clubTeamIds.length === 0) return { sent: 0 };
  if (!(await claimMatchFlag(supabase, matchId, "stats_published_at"))) return { sent: 0 };
  const recipients = await usersOfTeams(supabase, clubTeamIds);
  return sendPushToPref(
    supabase,
    "notify_team_stats",
    {
      title: "Estadísticas de tu equipo listas",
      body: `Ya puedes ver las estadísticas del partido de tu equipo ${teamName(home, "Local")} vs ${teamName(away, "Visitante")}.`,
      url: `/partidos/${matchId}`,
    },
    recipients
  );
}

/** «Nuevas noticias»: solo en la primera publicación. */
export async function notifyNewsPublished(
  supabase: SupabaseClient,
  news: { id: string; title: string; body: string }
) {
  const excerpt = news.body.replace(/\s+/g, " ").trim();
  return sendPushToPref(supabase, "notify_news", {
    title: `Nueva noticia: ${news.title}`,
    body: excerpt.length > 140 ? `${excerpt.slice(0, 137).trimEnd()}…` : excerpt,
    url: `/noticias/${news.id}`,
  });
}

/** Texto del recordatorio: «{equipo} vs {rival} · {hora} · {pabellón}». */
export function reminderBody(input: {
  home: TeamRow | null | undefined;
  away: TeamRow | null | undefined;
  scheduledAt: string;
  notes: string | null;
  isFederation?: boolean | null;
  location: string | null;
  court?: string | null;
}) {
  const homeIsClub = Boolean(input.home?.is_club_team);
  const awayIsClub = Boolean(input.away?.is_club_team);
  const club = !homeIsClub && awayIsClub ? input.away : input.home;
  const rival = club === input.home ? input.away : input.home;
  const short = formatMatchWhenShort({
    scheduledAt: input.scheduledAt,
    notes: input.notes,
    isFederation: input.isFederation,
  });
  const when = short === "Finde" ? "Hora por confirmar" : short;
  const place = [input.location?.trim(), courtLabel(input.court)].filter(Boolean).join(", ");
  return [`${club?.name || "Tu equipo"} vs ${rival?.name || "Rival"}`, when, place]
    .filter(Boolean)
    .join(" · ");
}
