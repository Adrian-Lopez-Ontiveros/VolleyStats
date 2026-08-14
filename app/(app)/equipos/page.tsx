import Link from "next/link";
import { CircleDot, Plus, Users } from "lucide-react";
import { CategoryNav } from "@/components/category-nav";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { TeamLogo } from "@/components/teams/team-logo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { QueryError } from "@/components/query-error";
import { requireViewer } from "@/lib/auth";
import { POSITION_LABELS } from "@/lib/constants";
import { getCategoryMeta, parseCategory } from "@/lib/categories";
import { createClient } from "@/lib/supabase/server";
import { formatJersey, initials } from "@/lib/utils";
import { totalPlayerPoints } from "@/lib/volleyball";
import type { Player, Team } from "@/lib/types";

export default async function TeamsPage({
  searchParams,
}: {
  searchParams: Promise<{ categoria?: string }>;
}) {
  const { categoria: rawCategory } = await searchParams;
  const { isAdmin } = await requireViewer();
  const categoria = parseCategory(rawCategory);
  const meta = getCategoryMeta(categoria);
  const supabase = await createClient();

  const { data: allTeams, error: teamsError } = await supabase.from("teams").select("*");
  const typedTeam =
    ((allTeams ?? []) as Team[]).find(
      (team) => team.is_club_team && team.category === categoria
    ) ?? null;

  const playersResult = typedTeam
    ? await supabase
        .from("players")
        .select("*")
        .eq("team_id", typedTeam.id)
        .order("jersey_number", { ascending: true, nullsFirst: false })
    : { data: [] as Player[], error: null };

  const typedPlayers = (playersResult.data ?? []) as Player[];
  const loadError = teamsError?.message ?? playersResult.error?.message;

  return (
    <>
      <PageHeader
        title="Equipos"
        description="Las tres plantillas de CV Fuenlabrada. Los rivales se gestionan desde Liga."
        action={
          isAdmin && !typedTeam ? (
            <Button asChild variant="accent" size="sm">
              <Link href={`/equipos/nuevo?categoria=${categoria}`}>
                <Plus className="h-4 w-4" />
                Crear
              </Link>
            </Button>
          ) : null
        }
      />

      <CategoryNav basePath="/equipos" value={categoria} />

      {loadError ? (
        <QueryError message={`No se pudieron cargar los equipos o la plantilla: ${loadError}`} />
      ) : !typedTeam ? (
        <EmptyState
          icon={CircleDot}
          title={`Sin equipo ${meta.label}`}
          description={
            isAdmin
              ? "Crea el equipo del club para esta categoría. Los rivales se añaden desde la clasificación."
              : "Todavía no hay equipo del club en esta categoría."
          }
        />
      ) : (
        <div className="space-y-5">
          <Link href={`/equipos/${typedTeam.id}`}>
            <Card className="transition-transform active:scale-[0.99]">
              <CardContent className="flex items-center justify-between gap-3 p-4">
                <div className="flex min-w-0 items-center gap-3">
                  <TeamLogo
                    name={typedTeam.name}
                    shortName={typedTeam.short_name}
                    logoUrl={typedTeam.logo_url}
                    size="md"
                  />
                  <div className="min-w-0">
                    <p className="font-semibold">{typedTeam.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {typedTeam.city || "Fuenlabrada"} · {meta.label}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  {typedTeam.short_name ? (
                    <Badge variant="secondary">{typedTeam.short_name}</Badge>
                  ) : null}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {typedPlayers.length} jugadores
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <section>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Plantilla</h2>
              {isAdmin ? (
                <Button asChild size="sm" variant="outline">
                  <Link href={`/jugadores/nuevo?team=${typedTeam.id}`}>
                    <Plus className="h-4 w-4" />
                    Jugador
                  </Link>
                </Button>
              ) : null}
            </div>

            {typedPlayers.length === 0 ? (
              <EmptyState
                icon={Users}
                title="Sin jugadores"
                description="Los jugadores de este equipo aparecerán aquí cuando un admin los dé de alta."
              />
            ) : (
              <div className="space-y-3">
                {typedPlayers.map((player) => (
                  <Link key={player.id} href={`/jugadores/${player.id}`}>
                    <Card className="transition-transform active:scale-[0.99]">
                      <CardContent className="flex items-center gap-3 p-4">
                        <Avatar className="h-12 w-12">
                          <AvatarImage
                            src={player.avatar_url ?? undefined}
                            alt={player.full_name}
                          />
                          <AvatarFallback>{initials(player.full_name)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold">
                            {formatJersey(player.jersey_number)} {player.full_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {isAdmin
                              ? player.user_id
                                ? "Cuenta vinculada"
                                : "Pendiente de registro"
                              : player.position
                                ? POSITION_LABELS[player.position]
                                : "Jugador"}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold tabular-nums">
                            {totalPlayerPoints(player)}
                          </p>
                          <p className="text-[11px] text-muted-foreground">puntos</p>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </>
  );
}
