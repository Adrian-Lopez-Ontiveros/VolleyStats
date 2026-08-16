"use client";

import { cn } from "@/lib/utils";
import {
  POSSESSION_OPTIONS,
  SET_PHASE_OPTIONS,
  type PhaseFilter,
  type PossessionPhase,
  type SetPhase,
} from "@/lib/stat-filters";

export function PhaseFilterBar({
  value,
  onChange,
  showPossession = true,
}: {
  value: PhaseFilter;
  onChange: (next: PhaseFilter) => void;
  showPossession?: boolean;
}) {
  return (
    <div className="space-y-2">
      <ChipRow
        options={SET_PHASE_OPTIONS}
        value={value.sets}
        onChange={(sets) => onChange({ ...value, sets })}
      />
      {showPossession ? (
        <ChipRow
          options={POSSESSION_OPTIONS}
          value={value.possession}
          onChange={(possession) => onChange({ ...value, possession })}
        />
      ) : null}
    </div>
  );
}

function ChipRow<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (next: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((option) => {
        const active = value === option.id;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-semibold",
              active
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function phaseLabel(filter: PhaseFilter) {
  const setLabel = SET_PHASE_OPTIONS.find((item) => item.id === filter.sets)?.label;
  const possLabel = POSSESSION_OPTIONS.find((item) => item.id === filter.possession)?.label;
  if (filter.sets === "all" && filter.possession === "all") return null;
  return [setLabel, filter.possession === "all" ? null : possLabel].filter(Boolean).join(" · ");
}

export type { PhaseFilter, PossessionPhase, SetPhase };
