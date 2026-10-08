"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getAppNavItems } from "@/components/layout/nav-items";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, initials } from "@/lib/utils";

export function BottomNav({
  isAdmin,
  isCoach = false,
  isGuest = false,
  profile = null,
}: {
  isAdmin: boolean;
  isCoach?: boolean;
  isGuest?: boolean;
  profile?: { name: string; avatarUrl: string | null } | null;
}) {
  const pathname = usePathname();
  const navItems = getAppNavItems({ isAdmin, isCoach, isGuest });
  const columns = navItems.length;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 shadow-nav backdrop-blur pb-safe lg:hidden">
      <ul
        className={cn(
          "mx-auto grid max-w-3xl",
          columns >= 8
            ? "grid-cols-8"
            : columns >= 7
            ? "grid-cols-7"
            : columns >= 6
              ? "grid-cols-6"
              : columns === 5
                ? "grid-cols-5"
                : columns === 3
                  ? "grid-cols-3"
                  : "grid-cols-4"
        )}
      >
        {navItems.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          const showProfile = item.href === "/perfil" && profile;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                prefetch
                className={cn(
                  "flex flex-col items-center gap-0.5 py-2 font-medium",
                  columns >= 6 ? "text-[9px]" : "text-[11px]",
                  active ? "text-accent" : "text-muted-foreground"
                )}
              >
                {showProfile ? (
                  <Avatar
                    className={cn(
                      "h-6 w-6 ring-2 ring-offset-1 ring-offset-background",
                      active ? "ring-accent" : "ring-transparent"
                    )}
                  >
                    <AvatarImage src={profile.avatarUrl ?? undefined} alt="" />
                    <AvatarFallback className="text-[9px]">
                      {initials(profile.name)}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <Icon className={cn("h-5 w-5", active && "stroke-[2.4]")} />
                )}
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
