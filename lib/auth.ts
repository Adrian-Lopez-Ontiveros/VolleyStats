import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  SPECTATOR_COOKIE,
  PLAYER_ROSTER_SELECT,
  PROFILE_SESSION_SELECT,
  hasCoachAccess,
} from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import type { Player, ProfileWithRelations, SessionUser } from "@/lib/types";

export type Viewer = {
  user: SessionUser | null;
  isAdmin: boolean;
  isCoach: boolean;
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

async function loadSessionUser(): Promise<SessionUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [{ data: profile }, { data: player }] = await Promise.all([
    supabase
      .from("profiles")
      .select(PROFILE_SESSION_SELECT as "*")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("players")
      .select(PLAYER_ROSTER_SELECT as "*")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  if (!profile) return null;

  return {
    id: user.id,
    email: user.email ?? profile.email,
    profile: {
      ...(profile as ProfileWithRelations),
      player: (player as Player | null) ?? null,
    },
  };
}

async function tryLinkPlayer(session: SessionUser): Promise<SessionUser> {
  const supabase = await createClient();
  await supabase.rpc("link_profile_to_matching_player");

  const { data: player } = await supabase
    .from("players")
    .select(PLAYER_ROSTER_SELECT as "*")
    .eq("user_id", session.id)
    .maybeSingle();

  if (!player) return session;

  return {
    ...session,
    profile: {
      ...session.profile,
      player: player as Player,
    },
  };
}

export async function requireUser() {
  const session = await getSessionUser();
  if (!session) redirect("/login");
  if (session.profile.player) return session;
  return tryLinkPlayer(session);
}

export async function requireViewer(): Promise<Viewer> {
  const user = await getSessionUser();
  if (user) {
    return {
      user,
      isAdmin: user.profile.role === "admin",
      isCoach: hasCoachAccess(user.profile.role),
      isGuest: false,
    };
  }

  if (await isSpectatorGuest()) {
    return { user: null, isAdmin: false, isCoach: false, isGuest: true };
  }

  redirect("/login");
}

export async function requireAdmin() {
  const session = await requireUser();
  if (session.profile.role !== "admin") redirect("/partidos");
  return session;
}

export async function requireCoach() {
  const session = await requireUser();
  if (!hasCoachAccess(session.profile.role)) redirect("/partidos");
  return session;
}

export async function requireMember() {
  const session = await getSessionUser();
  if (session) {
    if (session.profile.player) return session;
    return tryLinkPlayer(session);
  }
  if (await isSpectatorGuest()) redirect("/partidos");
  redirect("/login");
}
