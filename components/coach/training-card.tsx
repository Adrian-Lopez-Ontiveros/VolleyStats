import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { FileVideo, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { TrainingWithTeam } from "@/lib/types";

export function TrainingCard({ training }: { training: TrainingWithTeam }) {
  const fileCount = training.files?.length ?? 0;

  return (
    <Link href={`/entrenador/entrenamientos/${training.id}`}>
      <Card className="transition-transform active:scale-[0.99]">
        <CardContent className="space-y-2 p-4">
          <p className="text-xs font-medium capitalize text-muted-foreground">
            {format(new Date(training.scheduled_at), "EEE d MMM · HH:mm", { locale: es })}
          </p>
          <h3 className="text-base font-semibold leading-tight">{training.name}</h3>
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            {training.team ? (
              <span className="inline-flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                {training.team.short_name || training.team.name}
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1">
              <FileVideo className="h-3.5 w-3.5" />
              {fileCount === 1 ? "1 archivo" : `${fileCount} archivos`}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
