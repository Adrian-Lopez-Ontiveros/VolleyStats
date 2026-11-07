import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

export type TeamStaffMember = {
  key: string;
  fullName: string;
  avatarUrl: string | null;
  /** Equipo en el que juega, si es distinto de este. */
  playsInTeamName: string | null;
  /** Juega en este mismo equipo. */
  playsHere: boolean;
  pending: boolean;
};

/**
 * Cuerpo técnico de un equipo: team_coaches + coached_team_id (legado) + staff
 * pendiente de registro. Solo nombre/avatar; nunca email. Requiere sesión (RLS).
 */
export async function loadTeamStaff(supabase: Client, teamId: string): Promise<TeamStaffMember[]> {
  const [coaches, legacy, pendingStaff] = await Promise.all([
    supabase.from("team_coaches").select("user_id").eq("team_id", teamId),
    supabase.from("profiles").select("id").eq("coached_team_id", teamId),
    supabase
      .from("staff_roster")
      .select("id, full_name")
      .eq("coached_team_id", teamId)
      .is("user_id", null),
  ]);

  const userIds = new Set<string>();
  for (const row of (coaches.data ?? []) as { user_id: string }[]) userIds.add(row.user_id);
  for (const row of (legacy.data ?? []) as { id: string }[]) userIds.add(row.id);

  const members: TeamStaffMember[] = [];
  if (userIds.size > 0) {
    const ids = [...userIds];
    const [{ data: profiles }, { data: players }] = await Promise.all([
      supabase.from("profiles").select("id, full_name, avatar_url").in("id", ids),
      supabase
        .from("players")
        .select("user_id, team_id, team:teams(name)")
        .in("user_id", ids)
        .eq("is_private", false),
    ]);
    const playing = new Map<string, { teamId: string | null; teamName: string | null }>();
    for (const row of (players ?? []) as {
      user_id: string;
      team_id: string | null;
      team: { name?: string } | { name?: string }[] | null;
    }[]) {
      const team = Array.isArray(row.team) ? row.team[0] : row.team;
      playing.set(row.user_id, { teamId: row.team_id, teamName: team?.name ?? null });
    }
    for (const profile of (profiles ?? []) as {
      id: string;
      full_name: string;
      avatar_url: string | null;
    }[]) {
      const play = playing.get(profile.id);
      const playsHere = play?.teamId === teamId;
      members.push({
        key: profile.id,
        fullName: profile.full_name,
        avatarUrl: profile.avatar_url,
        playsHere,
        playsInTeamName: play?.teamId && !playsHere ? play.teamName : null,
        pending: false,
      });
    }
  }

  const known = new Set(members.map((m) => m.fullName.trim().toLowerCase()));
  for (const row of (pendingStaff.data ?? []) as { id: string; full_name: string }[]) {
    if (known.has(row.full_name.trim().toLowerCase())) continue;
    members.push({
      key: `staff-${row.id}`,
      fullName: row.full_name,
      avatarUrl: null,
      playsHere: false,
      playsInTeamName: null,
      pending: true,
    });
  }

  return members.sort((a, b) => a.fullName.localeCompare(b.fullName, "es"));
}
