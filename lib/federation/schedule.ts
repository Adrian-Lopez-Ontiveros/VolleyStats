import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

export const FMV_WEEKEND_NOTE = "[[fmv:weekend]]";

export type FmvSchedulePrecision = "exact" | "weekend" | "unknown";

export type FmvSchedule = {
  scheduledAt: string;
  precision: FmvSchedulePrecision;
  label: string;
};

/** FMV often publishes only the weekend (jornada Sunday + hora 0:00). */
export function parseFmvSchedule(input: {
  fecha?: string;
  hora?: string;
  fechaHora?: string;
  diaHora?: string;
  roundFecha?: string;
}): FmvSchedule {
  const fecha = (input.fecha || "").trim();
  const roundFecha = (input.roundFecha || "").trim();
  const hora = (input.hora || "").trim();
  const fechaHora = (input.fechaHora || "").trim();
  const diaHora = (input.diaHora || "").trim();

  const day = parseDayParts(fecha) ?? parseDayParts(roundFecha);
  const provisional =
    !day ||
    isPlaceholderTime(hora) ||
    isPlaceholderTime(extractTime(fechaHora)) ||
    /(?:^|[^\d])0:00|(?:^|[^\d])00:00/.test(diaHora);

  if (!day) {
    return {
      scheduledAt: "2099-01-01T11:00:00.000Z",
      precision: "unknown",
      label: "Horario por definir",
    };
  }

  if (provisional) {
    const sunday = toSundayOfWeekend(day);
    const saturday = addDays(sunday, -1);
    const scheduledAt = madridWallTimeToUtcIso(
      saturday.year,
      saturday.month,
      saturday.day,
      12,
      0
    );
    return {
      scheduledAt,
      precision: "weekend",
      label: weekendLabel(saturday, sunday),
    };
  }

  const time = parseTime(hora) ?? parseTime(extractTime(fechaHora)) ?? { hour: 12, minute: 0 };
  const scheduledAt = madridWallTimeToUtcIso(day.year, day.month, day.day, time.hour, time.minute);
  return {
    scheduledAt,
    precision: "exact",
    label: "",
  };
}

export function federationNotesForSchedule(
  precision: FmvSchedulePrecision,
  previousNotes?: string | null
) {
  const cleaned = stripFmvScheduleNote(previousNotes);
  if (precision === "weekend" || precision === "unknown") {
    return cleaned ? `${FMV_WEEKEND_NOTE}\n${cleaned}` : FMV_WEEKEND_NOTE;
  }
  return cleaned || null;
}

export function stripFmvScheduleNote(notes?: string | null) {
  if (!notes) return "";
  return notes
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && line !== FMV_WEEKEND_NOTE)
    .join("\n")
    .trim();
}

export function hasFmvWeekendSchedule(notes?: string | null) {
  return Boolean(notes?.includes(FMV_WEEKEND_NOTE));
}

export function formatMatchWhen(input: {
  scheduledAt: string;
  notes?: string | null;
  isFederation?: boolean | null;
}) {
  if (shouldShowWeekend(input)) {
    return formatWeekendFromScheduledAt(input.scheduledAt);
  }
  return formatInMadrid(input.scheduledAt, "EEE d MMM · HH:mm");
}

export function formatMatchWhenShort(input: {
  scheduledAt: string;
  notes?: string | null;
  isFederation?: boolean | null;
}) {
  if (shouldShowWeekend(input)) return "Finde";
  return formatInMadrid(input.scheduledAt, "HH:mm");
}

export function formatMatchDayLetter(input: {
  scheduledAt: string;
  notes?: string | null;
  isFederation?: boolean | null;
}) {
  if (shouldShowWeekend(input)) return "Finde";
  return formatInMadrid(input.scheduledAt, "EEE");
}

function shouldShowWeekend(input: {
  scheduledAt: string;
  notes?: string | null;
  isFederation?: boolean | null;
}) {
  return hasFmvWeekendSchedule(input.notes);
}

function formatWeekendFromScheduledAt(iso: string) {
  const saturday = madridParts(iso);
  const sunday = addDays(saturday, 1);
  return weekendLabel(saturday, sunday);
}

function weekendLabel(saturday: DayParts, sunday: DayParts) {
  const satMonth = monthShort(saturday);
  const sunMonth = monthShort(sunday);
  if (saturday.month === sunday.month) {
    return `Fin de semana ${saturday.day}–${sunday.day} ${satMonth}`;
  }
  return `Fin de semana ${saturday.day} ${satMonth}–${sunday.day} ${sunMonth}`;
}

function monthShort(day: DayParts) {
  return format(new Date(Date.UTC(day.year, day.month - 1, day.day, 12)), "MMM", { locale: es });
}

/** Madrid wall-clock `yyyy-MM` for grouping, independent of the runtime timezone. */
export function madridMonthKey(iso: string) {
  const parts = madridParts(iso);
  return `${parts.year}-${pad2(parts.month)}`;
}

/** Madrid wall-clock `yyyy-MM-dd` for grouping, independent of the runtime timezone. */
export function madridCalendarKey(iso: string) {
  const parts = madridParts(iso);
  return `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}`;
}

/**
 * Format Madrid wall-clock parts with date-fns.
 * Uses a local Date so `format()` prints 19:00 both on a UTC server and in a CEST browser.
 */
function formatInMadrid(iso: string, pattern: string) {
  const parts = madridParts(iso);
  const asLocal = new Date(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute);
  return format(asLocal, pattern, { locale: es });
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

type DayParts = { year: number; month: number; day: number; hour?: number; minute?: number };

function parseDayParts(value: string): DayParts | null {
  if (!value) return null;
  const match = value.trim().match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (!match) return null;
  return {
    year: Number(match[3]),
    month: Number(match[2]),
    day: Number(match[1]),
  };
}

function parseTime(value: string) {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  return { hour: Number(match[1]), minute: Number(match[2]) };
}

function extractTime(value: string) {
  const match = value.match(/(\d{1,2}:\d{2})/);
  return match?.[1] ?? "";
}

function isPlaceholderTime(value: string) {
  if (!value) return true;
  const normalized = value.trim().toLowerCase();
  return (
    normalized === "0:00" ||
    normalized === "00:00" ||
    normalized === "0.00" ||
    normalized === "00.00"
  );
}

function toSundayOfWeekend(day: DayParts): DayParts {
  const weekday = new Date(Date.UTC(day.year, day.month - 1, day.day, 12)).getUTCDay();
  if (weekday === 0) return day;
  return addDays(day, 7 - weekday);
}

function addDays(day: DayParts, amount: number): DayParts {
  const date = new Date(Date.UTC(day.year, day.month - 1, day.day + amount, 12));
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

function madridParts(iso: string): Required<DayParts> {
  const date = parseISO(iso);
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? "0");
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
  };
}

/** Convert a Madrid wall-clock time to a UTC ISO string. */
export function madridWallTimeToUtcIso(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number
) {
  let utc = Date.UTC(year, month - 1, day, hour, minute, 0);
  for (let i = 0; i < 4; i += 1) {
    const seen = madridParts(new Date(utc).toISOString());
    const seenAsUtc = Date.UTC(seen.year, seen.month - 1, seen.day, seen.hour, seen.minute, 0);
    const wanted = Date.UTC(year, month - 1, day, hour, minute, 0);
    utc += wanted - seenAsUtc;
  }
  return new Date(utc).toISOString();
}


/** `datetime-local` value (YYYY-MM-DDTHH:mm) interpreted as Europe/Madrid → UTC ISO. */
export function datetimeLocalMadridToIso(value: string) {
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!match) {
    throw new Error("Fecha u hora no válida");
  }
  return madridWallTimeToUtcIso(
    Number(match[1]),
    Number(match[2]),
    Number(match[3]),
    Number(match[4]),
    Number(match[5])
  );
}

/** UTC ISO → `datetime-local` string in Europe/Madrid. */
export function isoToDatetimeLocalMadrid(iso: string) {
  const parts = madridParts(iso);
  return `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}T${pad2(parts.hour)}:${pad2(parts.minute)}`;
}
