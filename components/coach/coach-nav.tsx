"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpFromLine, ClipboardList, PenLine } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/entrenador", label: "Entrenamientos", icon: ClipboardList, match: "trainings" },
  { href: "/entrenador/pizarra", label: "Pizarra", icon: PenLine, match: "board" },
  { href: "/entrenador/saltos", label: "Salto", icon: ArrowUpFromLine, match: "jumps" },
] as const;

function activeFor(pathname: string, match: (typeof items)[number]["match"]) {
  if (match === "board") return pathname.startsWith("/entrenador/pizarra");
  if (match === "jumps") return pathname.startsWith("/entrenador/saltos");
  return (
    pathname === "/entrenador" ||
    pathname.startsWith("/entrenador/entrenamientos")
  );
}

export function CoachNav() {
  const pathname = usePathname();

  return (
    <nav className="mb-5 grid grid-cols-3 gap-1 rounded-xl bg-secondary p-1">
      {items.map((item) => {
        const active = activeFor(pathname, item.match);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-center text-xs font-semibold transition-colors sm:text-sm",
              active
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
