import dynamic from "next/dynamic";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { formatJersey } from "@/lib/utils";
import { countPointTypes, topMatchScorers } from "@/lib/stats";
import type { MatchEventWithPlayer, MatchWithTeams } from "@/lib/types";

const PointTypeBarChart = dynamic(
  () => import("@/components/stats/charts").then((mod) => mod.PointTypeBarChart),
  { loading: () => <div className="h-64 w-full" /> }
);

export function MatchStatsPanel({
  match,
  events,
}: {
  match: MatchWithTeams;
  events: MatchEventWithPlayer[];
}) {
  const homeEvents = events.filter((event) => event.acting_team_id === match.home_team_id);
  const awayEvents = events.filter((event) => event.acting_team_id === match.away_team_id);
  const homeCounts = countPointTypes(homeEvents);
  const awayCounts = countPointTypes(awayEvents);
  const scorers = topMatchScorers(events);
  const homeLabel = match.home_team.short_name || match.home_team.name;
  const awayLabel = match.away_team.short_name || match.away_team.name;

  if (events.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Cuando se anoten puntos verás aquí el resumen estadístico del partido.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <h3 className="mb-3 text-sm font-semibold">Acciones por tipo</h3>
          <PointTypeBarChart
            home={homeCounts}
            away={awayCounts}
            homeLabel={homeLabel}
            awayLabel={awayLabel}
          />
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <TeamMiniStats
          label={homeLabel}
          attacks={homeCounts.attack}
          blocks={homeCounts.block}
          aces={homeCounts.ace}
          errors={homeCounts.error}
        />
        <TeamMiniStats
          label={awayLabel}
          attacks={awayCounts.attack}
          blocks={awayCounts.block}
          aces={awayCounts.ace}
          errors={awayCounts.error}
        />
      </div>

      {scorers.length > 0 ? (
        <Card>
          <CardContent className="p-4">
            <h3 className="mb-3 text-sm font-semibold">Máximos anotadores</h3>
            <ol className="space-y-2">
              {scorers.map((scorer, index) => (
                <li key={scorer.playerId} className="flex items-center justify-between text-sm">
                  <Link href={`/jugadores/${scorer.playerId}`} className="font-medium hover:underline">
                    {index + 1}. {scorer.name} {formatJersey(scorer.jersey)}
                  </Link>
                  <span className="tabular-nums text-muted-foreground">
                    {scorer.points} pts
                    {scorer.errors ? ` · ${scorer.errors} err` : ""}
                  </span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function TeamMiniStats({
  label,
  attacks,
  blocks,
  aces,
  errors,
}: {
  label: string;
  attacks: number;
  blocks: number;
  aces: number;
  errors: number;
}) {
  return (
    <Card>
      <CardContent className="space-y-1 p-4 text-sm">
        <p className="font-semibold">{label}</p>
        <p className="text-muted-foreground">Ataques {attacks}</p>
        <p className="text-muted-foreground">Bloqueos {blocks}</p>
        <p className="text-muted-foreground">Aces {aces}</p>
        <p className="text-muted-foreground">Errores {errors}</p>
      </CardContent>
    </Card>
  );
}
