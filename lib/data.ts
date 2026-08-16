import { cache } from "react";
import {
  MATCH_LIST_SELECT,
  MATCH_STANDING_SELECT,
  PLAYER_ROSTER_SELECT,
  TEAM_SELECT,
} from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";

export const getTeams = cache(async () => {
  const supabase = await createClient();
  return supabase.from("teams").select(TEAM_SELECT as "*").order("name");
});

export const getClubTeams = cache(async () => {
  const supabase = await createClient();
  return supabase.from("teams").select(TEAM_SELECT as "*").eq("is_club_team", true).order("name");
});

export const getMatchesList = cache(async () => {
  const supabase = await createClient();
  return supabase
    .from("matches")
    .select(MATCH_LIST_SELECT as "*")
    .order("scheduled_at", { ascending: false });
});

export const getFinishedMatches = cache(async () => {
  const supabase = await createClient();
  return supabase.from("matches").select(MATCH_STANDING_SELECT as "*").eq("status", "finished");
});

export const getPlayers = cache(async () => {
  const supabase = await createClient();
  return supabase
    .from("players")
    .select(PLAYER_ROSTER_SELECT as "*")
    .order("jersey_number", { ascending: true, nullsFirst: false });
});
