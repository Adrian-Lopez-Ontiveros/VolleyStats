import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  SPECTATOR_COOKIE,
  PLAYER_ROSTER_SELECT,
  PROFILE_SESSION_SELECT,
  PROFILE_SESSION_SELECT_LEGACY,
  hasCoachAccess,
} from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import { unwrapOne } from "@/lib/utils";
import type { Player, ProfileWithRelations, SessionUser } from "@/lib/types";

export type Viewer = {
  user: SessionUser | null;
  isAdmin: boolean;
  isCoach: boolean;
  canManage: boolean;
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

  const [{ data: profile, error: profileError }, { data: player }] = await Promise.all([
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

  let resolved = profile;
  if (!resolved && profileError && /coached_team_id/i.test(profileError.message)) {
    const fallback = await supabase
      .from("profiles")
      .select(PROFILE_SESSION_SELECT_LEGACY as "*")
      .eq("id", user.id)
      .maybeSingle();
    resolved = fallback.data;
  }

  if (!resolved) return null;

  const typed = resolved as ProfileWithRelations;
  return {
    id: user.id,
    email: user.email ?? typed.email,
    profile: {
      ...typed,
      team: unwrapOne(typed.team),
      coached_team: unwrapOne(typed.coached_team ?? null),
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
    const staff = hasCoachAccess(user.profile.role);
    return {
      user,
      isAdmin: user.profile.role === "admin",
      isCoach: staff,
      canManage: staff,
      isGuest: false,
    };
  }

  if (await isSpectatorGuest()) {
    return { user: null, isAdmin: false, isCoach: false, canManage: false, isGuest: true };
  }

  redirect("/login");
}

export function ownPlayerId(viewer: Pick<Viewer, "user">) {
  return viewer.user?.profile.player?.id ?? null;
}

export function canViewPlayerStats(viewer: Pick<Viewer, "canManage" | "user">, playerId?: string | null) {
  if (viewer.canManage) return true;
  return Boolean(playerId && ownPlayerId(viewer) === playerId);
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
  if (await isSpectatorGuest()) redirect("/noticias");
  redirect("/login");
}
