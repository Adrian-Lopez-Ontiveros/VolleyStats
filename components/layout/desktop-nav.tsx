"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getAppNavItems } from "@/components/layout/nav-items";
import { cn } from "@/lib/utils";

export function DesktopNav({
  isAdmin,
  isCoach = false,
  isGuest = false,
}: {
  isAdmin: boolean;
  isCoach?: boolean;
  isGuest?: boolean;
}) {
  const pathname = usePathname();
  const items = getAppNavItems({ isAdmin, isCoach, isGuest });

  return (
    <nav className="hidden min-w-0 flex-1 items-center justify-center gap-0.5 overflow-x-auto lg:flex">
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch
            className={cn(
              "whitespace-nowrap rounded-lg px-2.5 py-2 text-sm font-semibold transition-colors xl:px-3",
              active
                ? "bg-accent/10 text-accent"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
