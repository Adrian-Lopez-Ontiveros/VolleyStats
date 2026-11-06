"use client";

import { useEffect, useState } from "react";
import { loadSetStart, saveSetStart } from "@/lib/set-start";
import { ROTATION_PLAY_ORDER, type SetStart } from "@/lib/volleyball-stats";
import { cn } from "@/lib/utils";

/**
 * Saque y rotación con la que empieza el 1er set. Igual que en el resto de sets,
 * se elige aquí y la pantalla de estadísticas arranca con ello.
 */
export function SetOneStartFields({
  matchId,
  homeTeamId,
  awayTeamId,
  homeLabel,
  awayLabel,
  value: controlledValue,
  onChange,
}: {
  matchId: string;
  homeTeamId: string;
  awayTeamId: string;
  homeLabel: string;
  awayLabel: string;
  value?: SetStart | null;
  onChange?: (value: SetStart) => void;
}) {
  const [localValue, setLocalValue] = useState<SetStart>({});
  useEffect(() => {
    setLocalValue(loadSetStart(matchId, 1) ?? {});
  }, [matchId]);
  const value = controlledValue === undefined ? localValue : (controlledValue ?? {});

  function update(next: SetStart) {
    saveSetStart(matchId, 1, next);
    setLocalValue((prev) => ({ ...prev, ...next }));
    onChange?.(next);
  }

  const server = value.servingTeamId ?? homeTeamId;

  return (
    <div className="space-y-3 rounded-2xl border bg-card p-3">
      <div>
        <p className="text-sm font-semibold">Inicio del 1er set</p>
        <p className="text-xs text-muted-foreground">
          Quién saca primero y en qué rotación (zona de la colocadora) empieza cada equipo. Sin
          rotación elegida, se usa la de la alineación.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {[
          { id: homeTeamId, label: homeLabel },
          { id: awayTeamId, label: awayLabel },
        ].map((team) => (
          <button
            key={team.id}
            type="button"
            onClick={() => update({ servingTeamId: team.id })}
            className={cn(
              "h-10 rounded-xl text-sm font-semibold",
              server === team.id ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
            )}
          >
            Saca {team.label}
          </button>
        ))}
      </div>
      {(
        [
          ["homeRotation", homeLabel],
          ["awayRotation", awayLabel],
        ] as const
      ).map(([field, label]) => (
        <div key={field} className="flex items-center gap-2">
          <span className="w-20 shrink-0 truncate text-xs font-medium text-muted-foreground">{label}</span>
          <div className="grid flex-1 grid-cols-6 gap-1">
            {ROTATION_PLAY_ORDER.map((rotation) => (
              <button
                key={rotation}
                type="button"
                aria-label={`Rotación ${rotation} de ${label}`}
                onClick={() => update({ [field]: value[field] === rotation ? null : rotation })}
                className={cn(
                  "h-9 rounded-lg text-xs font-bold tabular-nums",
                  value[field] === rotation
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground"
                )}
              >
                R{rotation}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
