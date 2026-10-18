"use client";

import { useCallback, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { TEAM_CATEGORIES, type TeamCategory } from "@/lib/categories";
import { cn } from "@/lib/utils";

export function useCategoryFilter(initial: TeamCategory | "all") {
  const pathname = usePathname();
  const [value, setValue] = useState(initial);

  const setCategory = useCallback(
    (next: TeamCategory | "all") => {
      setValue(next);
      const url = next === "all" ? pathname : `${pathname}?categoria=${next}`;
      window.history.replaceState(null, "", url);
    },
    [pathname]
  );

  return [value, setCategory] as const;
}

const GRID_COLS: Record<number, string> = {
  3: "grid-cols-3",
  4: "grid-cols-4",
  5: "grid-cols-5",
};

export function CategoryNav({
  basePath,
  value,
  allowAll = false,
  suspended = false,
  onChange,
}: {
  basePath: string;
  value: TeamCategory | "all";
  allowAll?: boolean;
  suspended?: boolean;
  onChange?: (value: TeamCategory | "all") => void;
}) {
  const items = allowAll
    ? [{ id: "all" as const, line1: "Todos", line2: "las ligas" }, ...TEAM_CATEGORIES]
    : TEAM_CATEGORIES;

  return (
    <div
      className={cn(
        "mb-5 grid gap-1 rounded-xl bg-secondary p-1",
        GRID_COLS[items.length] ?? "grid-cols-4"
      )}
    >
      {items.map((item) => {
        const href = item.id === "all" ? basePath : `${basePath}?categoria=${item.id}`;
        const active = !suspended && value === item.id;
        const className = cn(
          "min-w-0 rounded-lg py-2",
          items.length >= 5 ? "px-0.5" : "px-1.5",
          "text-center leading-tight transition-colors",
          active
            ? "bg-card text-foreground shadow-sm"
            : "bg-transparent text-muted-foreground hover:text-foreground"
        );

        if (onChange) {
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange(item.id)}
              className={className}
            >
              <span className="block text-xs font-semibold sm:text-sm">{item.line1}</span>
              <span className="block text-[10px] font-medium opacity-80 sm:text-xs">
                {item.line2}
              </span>
            </button>
          );
        }

        return (
          <Link key={item.id} href={href} className={className}>
            <span className="block text-xs font-semibold sm:text-sm">{item.line1}</span>
            <span className="block text-[10px] font-medium opacity-80 sm:text-xs">
              {item.line2}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
