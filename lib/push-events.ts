// Avisos disparados por eventos del servidor (cron, cierre de partido). No es una server action.
import { involvesClubTeam } from "@/lib/federation/leagues";
import { madridCalendarKey } from "@/lib/federation/schedule";
import { notifyLeagueResult, notifyTeamStats, pushDb, reminderBody, sendPushToPref } from "@/lib/push";
import { unwrapOne } from "@/lib/utils";

/** Partido cerrado desde la app (con seguimiento): resultado de liga + estadísticas del equipo. */
export async function notifyMatchFinished(matchId: string) {
  const supabase = await pushDb();
  await notifyLeagueResult(supabase, matchId);
  const { count } = await supabase
    .from("match_events")
    .select("id", { count: "exact", head: true })
    .eq("match_id", matchId);
  if ((count ?? 0) > 0) await notifyTeamStats(supabase, matchId);
}

function madridTomorrowKey() {
  const today = madridCalendarKey(new Date().toISOString());
  const [year, month, day] = today.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + 1));
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}-${pad(next.getUTCDate())}`;
}

export async function sendDueMatchReminders() {
  const supabase = await pushDb();
  const tomorrow = madridTomorrowKey();

  const reminderSelect =
    "id, scheduled_at, location, court, notes, status, is_federation, reminder_sent_at, home_team:teams!matches_home_team_id_fkey(name, short_name, is_club_team), away_team:teams!matches_away_team_id_fkey(name, short_name, is_club_team)";
  const reminderSelectBase =
    "id, scheduled_at, location, notes, status, is_federation, reminder_sent_at, home_team:teams!matches_home_team_id_fkey(name, short_name, is_club_team), away_team:teams!matches_away_team_id_fkey(name, short_name, is_club_team)";
  const first = await supabase
    .from("matches")
    .select(reminderSelect)
    .eq("status", "scheduled")
    .is("reminder_sent_at", null);
  const loaded =
    first.error && /court/i.test(first.error.message)
      ? await supabase
          .from("matches")
          .select(reminderSelectBase)
          .eq("status", "scheduled")
          .is("reminder_sent_at", null)
      : first;
  const { data: matches, error } = loaded;

  if (error || !matches?.length) {
    return { sent: 0, matches: 0, error: error?.message };
  }

  const due = (
    matches as {
      id: string;
      scheduled_at: string;
      location: string | null;
      court?: string | null;
      notes: string | null;
      is_federation?: boolean;
      home_team: { name?: string; short_name?: string | null; is_club_team?: boolean } | { name?: string; short_name?: string | null; is_club_team?: boolean }[] | null;
      away_team: { name?: string; short_name?: string | null; is_club_team?: boolean } | { name?: string; short_name?: string | null; is_club_team?: boolean }[] | null;
    }[]
  ).filter((match) => {
    const home = unwrapOne(match.home_team);
    const away = unwrapOne(match.away_team);
    if (!involvesClubTeam({ home_team: home, away_team: away })) return false;
    return madridCalendarKey(match.scheduled_at) === tomorrow;
  });

  if (due.length === 0) return { sent: 0, matches: 0 };

  // Un aviso por partido: «Mañana juegas» · «{equipo} vs {rival} · {hora} · {pabellón}».
  for (const match of due) {
    await sendPushToPref(supabase, "notify_match_reminder", {
      title: "Mañana juegas",
      body: reminderBody({
        home: unwrapOne(match.home_team),
        away: unwrapOne(match.away_team),
        scheduledAt: match.scheduled_at,
        notes: match.notes,
        isFederation: match.is_federation,
        location: match.location,
        court: match.court,
      }),
      url: `/partidos/${match.id}`,
    });
  }

  await supabase
    .from("matches")
    .update({ reminder_sent_at: new Date().toISOString() })
    .in(
      "id",
      due.map((match) => match.id)
    );

  return { sent: due.length, matches: due.length };
}
