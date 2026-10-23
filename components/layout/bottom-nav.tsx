"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AppLogo } from "@/components/app-logo";
import { getAppNavItems } from "@/components/layout/nav-items";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FRAME_CLASS } from "@/lib/game";
import { cn, initials } from "@/lib/utils";

const NAV_LOGOS: Record<string, { src: string; className: string }> = {
  "/partidos": { src: "/partidos-logo.png", className: "h-7 w-8" },
  "/liga": { src: "/liga-logo.png", className: "h-7 w-7" },
  "/predicciones": { src: "/predictions-logo.png", className: "h-7 w-7" },
};

export function BottomNav({
  isAdmin,
  isCoach = false,
  isGuest = false,
  profile = null,
}: {
  isAdmin: boolean;
  isCoach?: boolean;
  isGuest?: boolean;
  profile?: { name: string; avatarUrl: string | null; frameId?: string | null } | null;
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
          const logo = NAV_LOGOS[item.href];
          const showProfile = item.href === "/perfil" && profile;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                prefetch
                className={cn(
                  "flex flex-col items-center gap-1 py-2 font-medium leading-none",
                  columns >= 6 ? "text-[9px]" : "text-[11px]",
                  active ? "text-accent" : "text-muted-foreground"
                )}
              >
                {/* Mismo hueco de 28 px para iconos, logos y foto: todo alineado a la misma altura. */}
                <span className="flex h-7 w-8 items-center justify-center" aria-hidden>
                  {showProfile ? (
                    <ProfilePhoto profile={profile} active={active} />
                  ) : logo ? (
                    <AppLogo src={logo.src} className={logo.className} />
                  ) : (
                    <Icon className={cn("h-7 w-7", active ? "stroke-[2.2]" : "stroke-[1.8]")} />
                  )}
                </span>
                <span className="truncate">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function ProfilePhoto({
  profile,
  active,
}: {
  profile: { name: string; avatarUrl: string | null; frameId?: string | null };
  active: boolean;
}) {
  const frame = profile.frameId ? FRAME_CLASS[profile.frameId] : null;
  if (frame) {
    return (
      <span className={cn("block h-7 w-7 shrink-0 rounded-full", frame)}>
        <Avatar className="h-full w-full">
          <AvatarImage src={profile.avatarUrl ?? undefined} alt="" />
          <AvatarFallback className="text-[9px]">{initials(profile.name)}</AvatarFallback>
        </Avatar>
      </span>
    );
  }

  return (
    <Avatar
      className={cn(
        "h-7 w-7 ring-2 ring-offset-1 ring-offset-background",
        active ? "ring-accent" : "ring-transparent"
      )}
    >
      <AvatarImage src={profile.avatarUrl ?? undefined} alt="" />
      <AvatarFallback className="text-[9px]">{initials(profile.name)}</AvatarFallback>
    </Avatar>
  );
}
