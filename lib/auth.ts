import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SPECTATOR_COOKIE } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import type { Player, ProfileWithRelations, SessionUser } from "@/lib/types";
import { personNamesMatch } from "@/lib/utils";

export type Viewer = {
  user: SessionUser | null;
  isAdmin: boolean;
  isGuest: boolean;
};

export async function isSpectatorGuest() {
  const store = await cookies();
  return store.get(SPECTATOR_COOKIE)?.value === "1";
}

export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  try {
    return await loadSessionUser();
  } catch {
    return null;
  }
});

async function resolveLinkedPlayer(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  profile: { full_name: string; team_id: string | null }
): Promise<Player | null> {
  const { data: byUser } = await supabase
    .from("players")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (byUser) return byUser as Player;

  await supabase.rpc("link_profile_to_matching_player");

  const { data: afterLink } = await supabase
    .from("players")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (afterLink) return afterLink as Player;

  const { data: candidates } = await supabase.from("players").select("*");

  const matches = ((candidates ?? []) as Player[]).filter((player) =>
    personNamesMatch(player.full_name, profile.full_name)
  );
  const sameTeam = profile.team_id
    ? matches.filter((player) => player.team_id === profile.team_id)
    : matches;

  return sameTeam[0] ?? matches[0] ?? null;
}

async function loadSessionUser(): Promise<SessionUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*, team:teams(*)")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) return null;

  const player = await resolveLinkedPlayer(supabase, user.id, {
    full_name: profile.full_name,
    team_id: profile.team_id,
  });

  return {
    id: user.id,
    email: user.email ?? profile.email,
    profile: {
      ...(profile as ProfileWithRelations),
      player,
    },
  };
}

export async function requireUser() {
  const session = await getSessionUser();
  if (!session) redirect("/login");
  return session;
}

export async function requireViewer(): Promise<Viewer> {
  const user = await getSessionUser();
  if (user) {
    return {
      user,
      isAdmin: user.profile.role === "admin",
      isGuest: false,
    };
  }

  if (await isSpectatorGuest()) {
    return { user: null, isAdmin: false, isGuest: true };
  }

  redirect("/login");
}

export async function requireAdmin() {
  const session = await requireUser();
  if (session.profile.role !== "admin") redirect("/partidos");
  return session;
}
