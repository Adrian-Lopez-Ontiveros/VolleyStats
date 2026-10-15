import { formatInMadrid, formatWeekendDays, hasFmvWeekendSchedule } from "@/lib/federation/schedule";
import type { MatchWithTeams } from "@/lib/types";

/** Partido aún sin empezar: programado y sin ningún punto/set registrado. */
export function isNotStarted(match: MatchWithTeams) {
  if (match.status !== "scheduled") return false;
  const points = (match.home_points ?? 0) + (match.away_points ?? 0);
  const sets = (match.home_sets ?? 0) + (match.away_sets ?? 0);
  return points === 0 && sets === 0 && (match.set_scores ?? []).length === 0;
}

/** Fecha y hora en Madrid; si la FMV no fija hora (o es 00:00), los días del fin de semana: "12/13 Octubre". */
export function upcomingWhen(match: MatchWithTeams) {
  const date = formatInMadrid(match.scheduled_at, "EEE d MMM");
  const weekend = hasFmvWeekendSchedule(match.notes);
  const hhmm = formatInMadrid(match.scheduled_at, "HH:mm");
  const isWeekend = weekend || hhmm === "00:00";
  const time = isWeekend ? formatWeekendDays(match.scheduled_at) : hhmm;
  return { date, time, isWeekend };
}
