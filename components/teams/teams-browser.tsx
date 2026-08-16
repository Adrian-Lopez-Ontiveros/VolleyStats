"use client";

import { useMemo } from "react";
import Link from "next/link";
import { CircleDot, Plus, Users } from "lucide-react";
import { CategoryNav, useCategoryFilter } from "@/components/category-nav";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { QueryError } from "@/components/query-error";
import { TeamLogo } from "@/components/teams/team-logo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { POSITION_LABELS } from "@/lib/constants";
import { getCategoryMeta, parseCategory, type TeamCategory } from "@/lib/categories";
import { formatJersey, initials } from "@/lib/utils";
import { totalPlayerPoints } from "@/lib/volleyball";
import type { Player, Team } from "@/lib/types";

export function TeamsBrowser({
  teams,
  players,
  isAdmin,
  initialCategory,
  loadError,
}: {
  teams: Team[];
  players: Player[];
  isAdmin: boolean;
  initialCategory: TeamCategory;
  loadError?: string;
}) {
  const [categoria, setCategoria] = useCategoryFilter(initialCategory);
  const activeCategory = parseCategory(typeof categoria === "string" ? categoria : initialCategory);
  const meta = getCategoryMeta(activeCategory);
  const typedTeam = useMemo(
    () => teams.find((team) => team.is_club_team && team.category === activeCategory) ?? null,
    [teams, activeCategory]
  );
  const typedPlayers = useMemo(
    () =>
      typedTeam
        ? players
            .filter((player) => player.team_id === typedTeam.id)
            .sort((a, b) => (a.jersey_number ?? 99) - (b.jersey_number ?? 99))
        : [],
    [players, typedTeam]
  );

  return (
    <>
      <PageHeader
        title="Equipos"
        description="Las tres plantillas de CV Fuenlabrada. Los rivales se gestionan desde Liga."
        action={
          isAdmin && !typedTeam ? (
            <Button asChild variant="accent" size="sm">
              <Link href={`/equipos/nuevo?categoria=${activeCategory}`}>
                <Plus className="h-4 w-4" />
                Crear
              </Link>
            </Button>
          ) : null
        }
      />

      <CategoryNav basePath="/equipos" value={activeCategory} onChange={setCategoria} />

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
                    federationTeamId={typedTeam.federation_team_id}
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
