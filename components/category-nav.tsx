import Link from "next/link";
import { TEAM_CATEGORIES, type TeamCategory } from "@/lib/categories";
import { cn } from "@/lib/utils";

export function CategoryNav({
  basePath,
  value,
  allowAll = false,
}: {
  basePath: string;
  value: TeamCategory | "all";
  allowAll?: boolean;
}) {
  const items = allowAll
    ? [{ id: "all" as const, line1: "Todos", line2: "los equipos" }, ...TEAM_CATEGORIES]
    : TEAM_CATEGORIES;

  return (
    <div
      className={cn(
        "mb-5 grid gap-1 rounded-xl bg-secondary p-1",
        allowAll ? "grid-cols-4" : "grid-cols-3"
      )}
    >
      {items.map((item) => {
        const href = item.id === "all" ? basePath : `${basePath}?categoria=${item.id}`;
        const active = value === item.id;
        return (
          <Link
            key={item.id}
            href={href}
            className={cn(
              "rounded-lg px-1.5 py-2 text-center leading-tight transition-colors",
              active
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
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
