import type { TeamCategory } from "@/lib/categories";

export type UserRole = "player" | "admin";

export type MatchStatus = "scheduled" | "live" | "finished" | "cancelled";

export type PointType =
  | "attack"
  | "block"
  | "ace"
  | "error"
  | "opponent_error"
  | "other"
  | "attack_error"
  | "attack_continuation"
  | "serve_error"
  | "serve_in"
  | "reception_good"
  | "reception_medium"
  | "reception_bad";

export type PlayerPosition =
  | "opuesto"
  | "central"
  | "receptor"
  | "colocador"
  | "libero"
  | "universal";

export type Team = {
  id: string;
  name: string;
  short_name: string | null;
  logo_url: string | null;
  city: string | null;
  category: TeamCategory | null;
  is_club_team: boolean;
  created_at: string;
  updated_at: string;
};

export type PlayerStats = {
  attack_points: number;
  block_points: number;
  aces: number;
  errors: number;
  opponent_errors: number;
  other_points: number;
  matches_played: number;
};

export type Player = {
  id: string;
  user_id: string | null;
  team_id: string | null;
  full_name: string;
  jersey_number: number | null;
  position: PlayerPosition | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
} & PlayerStats;

export type PlayerWithTeam = Player & {
  team: Team | null;
};

export type Profile = {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  role: UserRole;
  team_id: string | null;
  created_at: string;
  updated_at: string;
};

export type ProfileWithRelations = Profile & {
  team: Team | null;
  player: Player | null;
};

export type SetScore = {
  home: number;
  away: number;
};

export type Match = {
  id: string;
  home_team_id: string;
  away_team_id: string;
  scheduled_at: string;
  location: string | null;
  status: MatchStatus;
  home_sets: number;
  away_sets: number;
  current_set: number;
  home_points: number;
  away_points: number;
  set_scores: SetScore[];
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type MatchWithTeams = Match & {
  home_team: Team;
  away_team: Team;
};

export type MatchLineupEntry = {
  id: string;
  match_id: string;
  team_id: string;
  player_id: string;
  is_starter: boolean;
  is_libero: boolean;
  created_at: string;
  player?: Pick<Player, "id" | "full_name" | "jersey_number" | "position" | "avatar_url"> | null;
};

export type MatchSubstitution = {
  id: string;
  match_id: string;
  team_id: string;
  player_out_id: string;
  player_in_id: string;
  set_number: number | null;
  occurred_at: string | null;
  created_by: string | null;
  created_at: string;
  player_out?: Pick<Player, "id" | "full_name" | "jersey_number" | "position"> | null;
  player_in?: Pick<Player, "id" | "full_name" | "jersey_number" | "position"> | null;
};

export type MatchEvent = {
  id: string;
  match_id: string;
  set_number: number;
  player_id: string | null;
  acting_team_id: string;
  scoring_team_id: string | null;
  serving_team_id: string | null;
  home_rotation: number | null;
  away_rotation: number | null;
  point_type: PointType;
  created_by: string | null;
  created_at: string;
};

export type MatchEventWithPlayer = MatchEvent & {
  player: Pick<Player, "id" | "full_name" | "jersey_number"> | null;
};

export type SessionUser = {
  id: string;
  email: string;
  profile: ProfileWithRelations;
};
