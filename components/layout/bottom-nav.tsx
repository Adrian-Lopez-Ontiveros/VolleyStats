"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CircleDot, Medal, Shield, Trophy, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

const baseItems = [
  { href: "/partidos", label: "Partidos", icon: Trophy },
  { href: "/liga", label: "Liga", icon: Medal },
  { href: "/equipos", label: "Equipos", icon: CircleDot },
];

export function BottomNav({
  isAdmin,
  isGuest = false,
}: {
  isAdmin: boolean;
  isGuest?: boolean;
}) {
  const pathname = usePathname();

  const navItems = isGuest
    ? baseItems
    : isAdmin
      ? [...baseItems, { href: "/perfil", label: "Perfil", icon: UserRound }, { href: "/admin", label: "Admin", icon: Shield }]
      : [...baseItems, { href: "/perfil", label: "Perfil", icon: UserRound }];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 shadow-nav backdrop-blur pb-safe">
      <ul
        className={cn(
          "mx-auto grid max-w-3xl",
          isGuest ? "grid-cols-3" : isAdmin ? "grid-cols-5" : "grid-cols-4"
        )}
      >
        {navItems.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium",
                  active ? "text-accent" : "text-muted-foreground"
                )}
              >
                <Icon className={cn("h-5 w-5", active && "stroke-[2.4]")} />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
