import { formatEfficiency, playerEfficiencyFromStats, scoringPoints } from "@/lib/stats";
import type { PlayerStats } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";

const items = [
  { key: "total", label: "Puntos" },
  { key: "attack_points", label: "Ataque" },
  { key: "block_points", label: "Bloqueos" },
  { key: "aces", label: "Aces" },
  { key: "errors", label: "Errores" },
  { key: "opponent_errors", label: "Err. rival" },
  { key: "other_points", label: "Otros" },
  { key: "matches_played", label: "Partidos" },
] as const;

export function StatGrid({ stats }: { stats: PlayerStats }) {
  const values: Record<string, number> = {
    ...stats,
    total: scoringPoints(stats),
  };
  const efficiency = playerEfficiencyFromStats(stats);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map((item) => (
        <Card key={item.key}>
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {item.label}
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums">{values[item.key] ?? 0}</p>
          </CardContent>
        </Card>
      ))}
      <Card>
        <CardContent className="p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Eficiencia
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{formatEfficiency(efficiency)}</p>
        </CardContent>
      </Card>
    </div>
  );
}
