import { Input } from "@/components/ui/input";
import type { SetScore } from "@/lib/types";

export function SetScoreFields({
  setScores = [],
  homeLabel = "Local",
  awayLabel = "Visitante",
  disabled = false,
}: {
  setScores?: SetScore[];
  homeLabel?: string;
  awayLabel?: string;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-semibold">Resultado por sets</p>
        <p className="text-xs text-muted-foreground">
          Opcional. Útil si el partido no se siguió punto a punto. Un set válido tiene 2
          puntos de diferencia y al menos 15 puntos.
        </p>
      </div>
      <div className="grid grid-cols-[2.5rem_1fr_auto_1fr] items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        <span />
        <span className="truncate text-center">{homeLabel}</span>
        <span />
        <span className="truncate text-center">{awayLabel}</span>
      </div>
      {[1, 2, 3, 4, 5].map((setNumber) => {
        const score = setScores[setNumber - 1];
        return (
          <div
            key={setNumber}
            className="grid grid-cols-[2.5rem_1fr_auto_1fr] items-center gap-2"
          >
            <span className="text-sm font-semibold text-muted-foreground">S{setNumber}</span>
            <Input
              name={`set${setNumber}Home`}
              type="number"
              min={0}
              max={50}
              inputMode="numeric"
              disabled={disabled}
              defaultValue={score?.home ?? ""}
              placeholder="25"
              className="h-11 text-center tabular-nums"
            />
            <span className="text-sm text-muted-foreground">–</span>
            <Input
              name={`set${setNumber}Away`}
              type="number"
              min={0}
              max={50}
              inputMode="numeric"
              disabled={disabled}
              defaultValue={score?.away ?? ""}
              placeholder="20"
              className="h-11 text-center tabular-nums"
            />
          </div>
        );
      })}
    </div>
  );
}
