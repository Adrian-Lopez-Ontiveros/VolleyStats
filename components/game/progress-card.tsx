import { Flame, Star, Trophy } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { checkinXpForStreak, progressFromXp, rewardLabel } from "@/lib/game";
import type { UserProgress } from "@/lib/types";

export function ProgressCard({ progress }: { progress: UserProgress }) {
  const bar = progressFromXp(progress.xp);
  const nextCheckin = checkinXpForStreak(progress.current_streak + 1);
  const title = rewardLabel(progress.equipped_title);

  return (
    <Card className="overflow-hidden border-orange-200/80 bg-gradient-to-br from-orange-50 to-white dark:border-orange-400/25 dark:from-orange-950/55 dark:to-card">
      <CardContent className="space-y-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-orange-700 dark:text-orange-300">
              Nivel {bar.level}
            </p>
            <p className="text-2xl font-black tabular-nums">{progress.xp} XP</p>
            {title ? <p className="text-sm font-medium text-orange-800 dark:text-orange-200">{title}</p> : null}
          </div>
          <div className="flex gap-2">
            <StatChip icon={Flame} label={`${progress.current_streak} d`} hint="Racha" />
            <StatChip icon={Trophy} label={`${progress.longest_streak} d`} hint="Récord" />
          </div>
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {bar.xpIntoLevel} / {bar.xpForNext} XP para el nivel {bar.level + 1}
            </span>
            <span className="inline-flex items-center gap-1 font-medium text-orange-700 dark:text-orange-300">
              <Star className="h-3 w-3" />
              {Math.round(bar.ratio * 100)}%
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-orange-100 dark:bg-orange-950">
            <div
              className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-400"
              style={{ width: `${Math.max(4, bar.ratio * 100)}%` }}
            />
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Entra mañana y suma +{nextCheckin} XP. Cuantos más días seguidos, más experiencia.
        </p>
      </CardContent>
    </Card>
  );
}

function StatChip({
  icon: Icon,
  label,
  hint,
}: {
  icon: typeof Flame;
  label: string;
  hint: string;
}) {
  return (
    <div className="min-w-[4.25rem] rounded-2xl bg-white/80 px-2.5 py-2 text-center shadow-sm dark:bg-white/10 dark:shadow-none">
      <Icon className="mx-auto h-4 w-4 text-orange-600 dark:text-orange-300" />
      <p className="mt-0.5 text-sm font-bold tabular-nums">{label}</p>
      <p className="text-[10px] text-muted-foreground">{hint}</p>
    </div>
  );
}
