import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import type { ActivityEntry } from "@/lib/actions/activity";

export function ActivityLog({ entries }: { entries: ActivityEntry[] }) {
  if (entries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Todavía no hay cambios administrativos registrados en este partido.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {entries.map((entry) => (
        <li key={entry.id}>
          <Card>
            <CardContent className="space-y-1 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold">{entry.action}</p>
                <p className="text-[11px] tabular-nums text-muted-foreground">
                  {format(new Date(entry.created_at), "d MMM HH:mm", { locale: es })}
                </p>
              </div>
              <p className="text-xs text-muted-foreground">{entry.actor_name}</p>
              {entry.detail ? <p className="text-sm">{entry.detail}</p> : null}
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>
  );
}
