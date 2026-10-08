import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isTeamCategory, type TeamCategory } from "@/lib/categories";
import {
  SPECTATOR_COOKIE,
  PLAYER_ROSTER_SELECT,
  PROFILE_SESSION_SELECT,
  PROFILE_SESSION_SELECT_LEGACY,
  hasCoachAccess,
} from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import { unwrapOne } from "@/lib/utils";
import type { Player, ProfileWithRelations, SessionPlayer, SessionUser } from "@/lib/types";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

const SENIOR_CATEGORIES = new Set<TeamCategory>(["senior_masculino", "senior_femenino"]);

function asSessionPlayer(row: unknown): SessionPlayer | null {
  if (!row || typeof row !== "object") return null;
  const record = row as Player & {
    team?: { id?: string | null; category?: string | null } | { id?: string | null; category?: string | null }[] | null;
  };
  const team = unwrapOne(record.team);
  return {
    ...record,
    team:
      team?.id
        ? { id: team.id, category: isTeamCategory(team.category) ? team.category : null }
        : null,
  };
}

async function loadLinkedPlayer(supabase: ServerClient, userId: string) {
  const withTeam = await supabase
    .from("players")
    .select(`${PLAYER_ROSTER_SELECT}, team:teams!team_id(id, category)` as "*")
    .eq("user_id", userId)
    .maybeSingle();

  if (!withTeam.error) return asSessionPlayer(withTeam.data);

  const plain = await supabase
    .from("players")
    .select(PLAYER_ROSTER_SELECT as "*")
    .eq("user_id", userId)
    .maybeSingle();

  return asSessionPlayer(plain.data);
}

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

  const [{ data: profile, error: profileError }, player] = await Promise.all([
    supabase
      .from("profiles")
      .select(PROFILE_SESSION_SELECT as "*")
      .eq("id", user.id)
      .maybeSingle(),
    loadLinkedPlayer(supabase, user.id),
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
      player,
    },
  };
}

async function tryLinkPlayer(session: SessionUser): Promise<SessionUser> {
  const supabase = await createClient();
  await supabase.rpc("link_profile_to_matching_player");

  const player = await loadLinkedPlayer(supabase, session.id);
  if (!player) return session;

  return {
    ...session,
    profile: {
      ...session.profile,
      player,
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

export function viewerPlayerCategory(user: SessionUser | null | undefined): TeamCategory | null {
  const player = user?.profile.player;
  if (!player?.team_id) return null;
  if (isTeamCategory(player.team?.category)) return player.team.category;
  if (user?.profile.team?.id === player.team_id && isTeamCategory(user.profile.team.category)) {
    return user.profile.team.category;
  }
  return null;
}

export async function resolveViewerPlayerCategory(user: SessionUser | null): Promise<TeamCategory | null> {
  const direct = viewerPlayerCategory(user);
  if (direct) return direct;
  const teamId = user?.profile.player?.team_id;
  if (!teamId) return null;

  const supabase = await createClient();
  const { data } = await supabase.from("teams").select("category").eq("id", teamId).maybeSingle();
  const category = (data as { category?: string | null } | null)?.category;
  return isTeamCategory(category) ? category : null;
}

export async function resolveViewerTeamCategory(user: SessionUser | null): Promise<TeamCategory | null> {
  const playing = await resolveViewerPlayerCategory(user);
  if (playing) return playing;
  if (isTeamCategory(user?.profile.team?.category)) return user.profile.team.category;
  if (isTeamCategory(user?.profile.coached_team?.category)) return user.profile.coached_team.category;
  return null;
}

export async function peekPlayerCategory(playerId: string): Promise<TeamCategory | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("players")
    .select("team:teams!team_id(category)" as "*")
    .eq("id", playerId)
    .maybeSingle();
  const team = unwrapOne(
    (data as { team?: { category?: string | null } | { category?: string | null }[] | null } | null)?.team
  );
  return isTeamCategory(team?.category) ? team.category : null;
}

export function canViewPlayerStats(
  viewer: Pick<Viewer, "canManage" | "user">,
  playerId?: string | null,
  access?: {
    viewerCategory?: TeamCategory | null;
    targetCategory?: TeamCategory | null;
  }
) {
  if (viewer.canManage) return true;
  if (playerId && ownPlayerId(viewer) === playerId) return true;
  const viewerCategory = access?.viewerCategory;
  const targetCategory = access?.targetCategory;
  if (!viewerCategory || !SENIOR_CATEGORIES.has(viewerCategory)) return false;
  return Boolean(targetCategory && targetCategory !== "cadete_femenino");
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
