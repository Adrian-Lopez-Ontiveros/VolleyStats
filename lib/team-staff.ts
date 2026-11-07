import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

export type TeamStaffMember = {
  key: string;
  fullName: string;
  /** Equipo público en el que juega, si es distinto de este. */
  playsInTeamName: string | null;
  /** Juega en este mismo equipo. */
  playsHere: boolean;
  pending: boolean;
};

/**
 * Cuerpo técnico de un equipo público vía RPC list_team_staff_public (migración 054):
 * team_coaches + coached_team_id (legado) + staff pendiente, sin duplicados.
 * Solo nombres; funciona también para espectadores.
 */
export async function loadTeamStaff(supabase: Client, teamId: string): Promise<TeamStaffMember[]> {
  const { data, error } = await supabase.rpc("list_team_staff_public", { p_team_id: teamId });
  if (error || !data) return [];
  return (data as {
    full_name: string;
    plays_in_team_name: string | null;
    plays_here: boolean;
    pending: boolean;
  }[]).map((row, index) => ({
    key: `${index}-${row.full_name}`,
    fullName: row.full_name,
    playsInTeamName: row.plays_in_team_name,
    playsHere: row.plays_here,
    pending: row.pending,
  }));
}
