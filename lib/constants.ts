import type { MatchStatus, PlayerPosition, PointType, UserRole } from "@/lib/types";

export const APP_NAME = "FuenlaStats";
export const APP_DESCRIPTION =
  "Gestiona equipos, jugadores, partidos y estadísticas de voleibol en Fuenlabrada.";

export const ROLE_LABELS: Record<UserRole, string> = {
  player: "Jugador",
  coach: "Entrenador",
  admin: "Administrador",
};

export function hasCoachAccess(role?: string | null) {
  return role === "coach" || role === "admin";
}

export const COACH_MEDIA_BUCKET = "coach-media";
export const MAX_TRAINING_FILE_BYTES = 20 * 1024 * 1024;
export const MAX_TRAINING_VIDEO_BYTES = 50 * 1024 * 1024;

export const SPECTATOR_COOKIE = "fuenla_spectator";

export const POINT_TYPE_META: Record<
  PointType,
  { label: string; short: string; className: string; buttonClassName: string }
> = {
  attack: {
    label: "Ataque",
    short: "ATK",
    className: "bg-orange-100 text-orange-950",
    buttonClassName:
      "border-orange-400 bg-orange-100 text-orange-950 hover:bg-orange-200",
  },
  block: {
    label: "Bloqueo",
    short: "BLO",
    className: "bg-sky-100 text-sky-950",
    buttonClassName: "border-sky-400 bg-sky-100 text-sky-950 hover:bg-sky-200",
  },
  ace: {
    label: "Saque (ace)",
    short: "ACE",
    className: "bg-emerald-100 text-emerald-950",
    buttonClassName:
      "border-emerald-400 bg-emerald-100 text-emerald-950 hover:bg-emerald-200",
  },
  error: {
    label: "Error propio",
    short: "ERR",
    className: "bg-rose-100 text-rose-950",
    buttonClassName:
      "border-rose-400 bg-rose-100 text-rose-950 hover:bg-rose-200",
  },
  opponent_error: {
    label: "Error del rival",
    short: "ERV",
    className: "bg-amber-100 text-amber-950",
    buttonClassName:
      "border-amber-400 bg-amber-100 text-amber-950 hover:bg-amber-200",
  },
  other: {
    label: "Otro",
    short: "OTR",
    className: "bg-slate-200 text-slate-950",
    buttonClassName:
      "border-slate-400 bg-slate-200 text-slate-950 hover:bg-slate-300",
  },
  attack_error: {
    label: "Error de ataque",
    short: "EAT",
    className: "bg-rose-100 text-rose-950",
    buttonClassName:
      "border-rose-400 bg-rose-100 text-rose-950 hover:bg-rose-200",
  },
  attack_continuation: {
    label: "Ataque continuado",
    short: "CNT",
    className: "bg-orange-50 text-orange-900",
    buttonClassName:
      "border-orange-200 bg-orange-50 text-orange-900 hover:bg-orange-100",
  },
  serve_error: {
    label: "Error de saque",
    short: "ESA",
    className: "bg-rose-100 text-rose-950",
    buttonClassName:
      "border-rose-400 bg-rose-100 text-rose-950 hover:bg-rose-200",
  },
  serve_in: {
    label: "Saque dentro",
    short: "SDD",
    className: "bg-emerald-50 text-emerald-900",
    buttonClassName:
      "border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-100",
  },
  reception_good: {
    label: "Recepción buena",
    short: "RB",
    className: "bg-emerald-100 text-emerald-950",
    buttonClassName:
      "border-emerald-400 bg-emerald-100 text-emerald-950 hover:bg-emerald-200",
  },
  reception_medium: {
    label: "Recepción media",
    short: "RM",
    className: "bg-amber-100 text-amber-950",
    buttonClassName:
      "border-amber-400 bg-amber-100 text-amber-950 hover:bg-amber-200",
  },
  reception_bad: {
    label: "Recepción mala",
    short: "RX",
    className: "bg-rose-50 text-rose-900",
    buttonClassName:
      "border-rose-200 bg-rose-50 text-rose-900 hover:bg-rose-100",
  },
};

export const POSITION_LABELS: Record<PlayerPosition, string> = {
  opuesto: "Opuesto",
  central: "Central",
  receptor: "Receptor",
  colocador: "Colocador",
  libero: "Líbero",
  universal: "Universal",
};

export const PLAYER_CARD_SELECT =
  "id, player_id, photo_url, photo_focus_x, photo_focus_y, photo_zoom, name_mode, display_name, position, jump, attack, block, serve, reception, defense, rating_override, created_at, updated_at" as const;

export const MATCH_STATUS_META: Record<
  MatchStatus,
  { label: string; className: string }
> = {
  scheduled: {
    label: "Próximo",
    className: "border-sky-700 bg-sky-600 text-white",
  },
  live: {
    label: "En vivo",
    className: "border-orange-700 bg-orange-500 text-white",
  },
  finished: {
    label: "Finalizado",
    className: "border-slate-800 bg-slate-700 text-white",
  },
  cancelled: {
    label: "Cancelado",
    className: "border-slate-400 bg-slate-200 text-slate-900",
  },
};

export const FEDERATION_BADGE_CLASS = "border-violet-800 bg-violet-600 text-white";

export function matchStatusMeta(status: string | null | undefined) {
  if (status && status in MATCH_STATUS_META) {
    return MATCH_STATUS_META[status as MatchStatus];
  }
  return MATCH_STATUS_META.scheduled;
}

export const TEAM_SELECT =
  "id, name, short_name, logo_url, city, category, is_club_team, federation_team_id, created_at, updated_at" as const;

export const TEAM_SUMMARY_SELECT =
  "id, name, short_name, logo_url, city, category, is_club_team, federation_team_id" as const;

export const MATCH_LIST_SELECT =
  `id, home_team_id, away_team_id, scheduled_at, location, status, home_sets, away_sets, current_set, home_points, away_points, is_federation, federation_round, home_team:teams!matches_home_team_id_fkey(${TEAM_SUMMARY_SELECT}), away_team:teams!matches_away_team_id_fkey(${TEAM_SUMMARY_SELECT})` as const;

export const MATCH_WITH_TEAMS_SELECT =
  `id, home_team_id, away_team_id, scheduled_at, location, status, home_sets, away_sets, current_set, home_points, away_points, set_scores, notes, created_at, is_federation, federation_match_id, federation_round, home_team:teams!matches_home_team_id_fkey(${TEAM_SUMMARY_SELECT}), away_team:teams!matches_away_team_id_fkey(${TEAM_SUMMARY_SELECT})` as const;

export const MATCH_STANDING_SELECT =
  "home_team_id, away_team_id, status, home_sets, away_sets, set_scores" as const;

export const MATCH_TEAM_SERIES_SELECT =
  `id, home_team_id, away_team_id, scheduled_at, status, home_sets, away_sets, set_scores, home_team:teams!matches_home_team_id_fkey(name, short_name), away_team:teams!matches_away_team_id_fkey(name, short_name)` as const;

export const MATCH_EVENT_SELECT =
  "id, match_id, set_number, player_id, acting_team_id, scoring_team_id, serving_team_id, home_rotation, away_rotation, point_type, created_at, player:players(id, full_name, jersey_number)" as const;

export const MATCH_LINEUP_SELECT =
  "id, match_id, team_id, player_id, is_starter, is_libero, court_position, created_at" as const;

export const MATCH_SUB_SELECT =
  "id, match_id, team_id, player_out_id, player_in_id, set_number, occurred_at, created_at" as const;

export const PLAYER_ROSTER_SELECT =
  "id, user_id, team_id, full_name, jersey_number, position, avatar_url, attack_points, block_points, aces, errors, opponent_errors, other_points, matches_played" as const;

export const PLAYER_LINEUP_SELECT =
  "id, team_id, full_name, jersey_number, position, avatar_url" as const;

export const PROFILE_SESSION_SELECT =
  "id, email, full_name, avatar_url, role, team_id, created_at, updated_at, team:teams(id, name, short_name, logo_url, city, category, is_club_team, federation_team_id)" as const;

export const TRAINING_LIST_SELECT =
  "id, name, scheduled_at, team_id, notes, created_by, created_at, updated_at, team:teams(id, name, short_name, category), files:training_files(id)" as const;

export const TRAINING_DETAIL_SELECT =
  "id, name, scheduled_at, team_id, notes, created_by, created_at, updated_at, team:teams(id, name, short_name, category)" as const;

export const TRAINING_FILE_SELECT =
  "id, training_id, file_name, file_url, file_path, mime_type, file_size, created_by, created_at" as const;

export const TACTICAL_PLAY_SELECT =
  "id, name, notes, team_id, board, created_by, created_at, updated_at" as const;

export const JUMP_ANALYSIS_SELECT =
  "id, player_id, training_id, height_cm, source, video_url, video_path, takeoff_sec, landing_sec, notes, created_by, created_at, player:players(id, full_name, jersey_number, team_id), training:trainings(id, name, scheduled_at)" as const;

export const SETS_TO_WIN = 3;
export const REGULAR_SET_POINTS = 25;
export const DECIDING_SET_POINTS = 15;
export const MIN_LEAD = 2;
