import type { MatchStatus, PlayerPosition, PointType } from "@/lib/types";

export const APP_NAME = "FuenlaStats";
export const APP_DESCRIPTION =
  "Gestiona equipos, jugadores, partidos y estadísticas de voleibol en Fuenlabrada.";

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
};

export const POSITION_LABELS: Record<PlayerPosition, string> = {
  opuesto: "Opuesto",
  central: "Central",
  receptor: "Receptor",
  colocador: "Colocador",
  libero: "Líbero",
  universal: "Universal",
};

export const MATCH_STATUS_META: Record<
  MatchStatus,
  { label: string; className: string }
> = {
  scheduled: {
    label: "Próximo",
    className: "bg-sky-100 text-sky-800",
  },
  live: {
    label: "En curso",
    className: "bg-orange-100 text-orange-800",
  },
  finished: {
    label: "Finalizado",
    className: "bg-emerald-100 text-emerald-800",
  },
  cancelled: {
    label: "Cancelado",
    className: "bg-slate-100 text-slate-600",
  },
};

export const MATCH_WITH_TEAMS_SELECT =
  "id, home_team_id, away_team_id, scheduled_at, location, status, home_sets, away_sets, current_set, home_points, away_points, set_scores, notes, created_at, home_team:teams!matches_home_team_id_fkey(id, name, short_name, logo_url, city, category, is_club_team), away_team:teams!matches_away_team_id_fkey(id, name, short_name, logo_url, city, category, is_club_team)" as const;

export const MATCH_EVENT_SELECT =
  "id, match_id, set_number, player_id, acting_team_id, scoring_team_id, point_type, created_by, created_at, player:players(id, full_name, jersey_number)" as const;

export const PLAYER_ROSTER_SELECT =
  "id, user_id, team_id, full_name, jersey_number, position, avatar_url, attack_points, block_points, aces, errors, opponent_errors, other_points, matches_played, created_at, updated_at" as const;

export const SETS_TO_WIN = 3;
export const REGULAR_SET_POINTS = 25;
export const DECIDING_SET_POINTS = 15;
export const MIN_LEAD = 2;
