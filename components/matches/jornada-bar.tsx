"use client";

import { useEffect, useRef, type ReactNode, type Ref } from "react";
import { JORNADA_MAX } from "@/lib/federation/rounds";
import { cn } from "@/lib/utils";

const JORNADAS = Array.from({ length: JORNADA_MAX }, (_, index) => index + 1);

export function JornadaBar({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (jornada: number | null) => void;
}) {
  const activeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [value]);

  return (
    <div className="mb-4">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Jornada
      </p>
      <div className="flex gap-1 overflow-x-auto pb-1">
        <JornadaChip
          active={value == null}
          buttonRef={value == null ? activeRef : undefined}
          onClick={() => onChange(null)}
        >
          Todas
        </JornadaChip>
        {JORNADAS.map((jornada) => (
          <JornadaChip
            key={jornada}
            active={value === jornada}
            buttonRef={value === jornada ? activeRef : undefined}
            onClick={() => onChange(jornada)}
          >
            {jornada}
          </JornadaChip>
        ))}
      </div>
    </div>
  );
}

function JornadaChip({
  active,
  onClick,
  buttonRef,
  children,
}: {
  active: boolean;
  onClick: () => void;
  buttonRef?: Ref<HTMLButtonElement>;
  children: ReactNode;
}) {
  return (
    <button
      ref={buttonRef}
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "h-9 min-w-9 shrink-0 rounded-lg px-2.5 text-xs font-semibold tabular-nums",
        active ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
      )}
    >
      {children}
    </button>
  );
}
