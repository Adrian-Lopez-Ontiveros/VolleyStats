import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { FederationSync } from "@/components/admin/federation-sync";
import { RoleSelect } from "@/components/admin/role-select";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ROLE_LABELS, TEAM_SELECT } from "@/lib/constants";
import type { Profile, Team, UserRole } from "@/lib/types";

export const metadata: Metadata = { title: "Administración" };

export default async function AdminPage() {
  const session = await requireAdmin();
  const supabase = await createClient();
  const [{ data: users }, { data: teams }, { data: players }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, email, full_name, role, team_id, coached_team_id, created_at")
      .order("created_at", { ascending: false }),
    supabase.from("teams").select(TEAM_SELECT as "*").eq("is_club_team", true).order("name"),
    supabase.from("players").select("user_id, team:teams(name)"),
  ]);

  const clubTeams = (teams ?? []) as Team[];
  const playingByUser = new Map<string, string>();
  for (const row of players ?? []) {
    const userId = (row as { user_id?: string | null }).user_id;
    const team = (row as { team?: { name?: string } | { name?: string }[] | null }).team;
    const teamName = Array.isArray(team) ? team[0]?.name : team?.name;
    if (userId && teamName) playingByUser.set(userId, teamName);
  }

  return (
    <>
      <PageHeader
        title="Administración"
        description="Roles, equipo que juega y equipo que entrena. El entrenador puede crear partidos, plantilla y noticias."
      />

      <div className="mb-6 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <Button asChild variant="accent">
          <Link href="/partidos/nuevo">
            <Plus className="h-4 w-4" />
            Partido
          </Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/liga">
            <Plus className="h-4 w-4" />
            Rival
          </Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/jugadores/nuevo">
            <Plus className="h-4 w-4" />
            Jugador
          </Link>
        </Button>
      </div>

      <div className="mb-6">
        <FederationSync />
      </div>

      <h2 className="mb-3 text-lg font-semibold">Usuarios y roles</h2>
      <div className="grid gap-3 lg:grid-cols-2">
        {((users ?? []) as Profile[]).map((profile) => (
          <Card key={profile.id}>
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="truncate font-semibold">{profile.full_name}</p>
                <p className="truncate text-xs text-muted-foreground">{profile.email}</p>
              </div>
              <div className="flex items-center justify-between gap-2 sm:justify-end">
                <Badge variant={roleBadgeVariant(profile.role)}>{ROLE_LABELS[profile.role]}</Badge>
                <RoleSelect
                  userId={profile.id}
                  role={profile.role}
                  coachedTeamId={profile.coached_team_id ?? null}
                  playingTeamName={playingByUser.get(profile.id) ?? null}
                  clubTeams={clubTeams}
                  disabled={profile.id === session.id}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}

function roleBadgeVariant(role: UserRole) {
  if (role === "admin") return "accent" as const;
  if (role === "coach") return "default" as const;
  return "secondary" as const;
}
