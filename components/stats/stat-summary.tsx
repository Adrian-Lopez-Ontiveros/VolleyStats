import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type StatSummaryItem = {
  label: string;
  value: string | number;
  hint?: string;
  accent?: boolean;
  onClick?: () => void;
};

export function StatSummary({
  items,
}: {
  items: StatSummaryItem[];
}) {
  return (
    <div className={cn("grid gap-3", items.length > 3 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3")}>
      {items.map((item) => {
        const interactive = Boolean(item.onClick);
        const body = (
          <CardContent className="p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {item.label}
            </p>
            <p
              className={cn(
                "mt-1 text-2xl font-bold tabular-nums",
                item.accent && "text-accent"
              )}
            >
              {item.value}
            </p>
            {item.hint ? (
              <p className="mt-1 text-[11px] text-muted-foreground">{item.hint}</p>
            ) : interactive ? (
              <p className="mt-1 text-[11px] font-medium text-primary">Ver detalle</p>
            ) : null}
          </CardContent>
        );

        if (interactive) {
          return (
            <button
              key={item.label}
              type="button"
              onClick={item.onClick}
              className="rounded-2xl text-left transition-transform active:scale-[0.98]"
            >
              <Card className="h-full cursor-pointer transition-colors hover:bg-secondary/50">
                {body}
              </Card>
            </button>
          );
        }

        return (
          <Card key={item.label}>
            {body}
          </Card>
        );
      })}
    </div>
  );
}

export function WinRateCard({
  won,
  played,
  winRate,
}: {
  won: number;
  played: number;
  winRate: number;
}) {
  const angle = Math.round((winRate / 100) * 360);

  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-4">
        <div
          className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full"
          style={{
            background: `conic-gradient(hsl(var(--accent)) ${angle}deg, hsl(var(--secondary)) 0deg)`,
          }}
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-card text-sm font-bold tabular-nums">
            {Math.round(winRate)}%
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold">Ratio de victorias</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {won} ganados de {played} finalizados
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export function AttendanceCard({
  played,
  teamMatches,
}: {
  played: number;
  teamMatches: number;
}) {
  const rate = teamMatches === 0 ? 0 : (played / teamMatches) * 100;
  const angle = Math.round((rate / 100) * 360);

  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-4">
        <div
          className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full"
          style={{
            background: `conic-gradient(hsl(var(--primary)) ${angle}deg, hsl(var(--secondary)) 0deg)`,
          }}
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-card text-sm font-bold tabular-nums">
            {Math.round(rate)}%
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold">Asistencia</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {played} de {teamMatches} partidos del equipo con estadística registrada
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
