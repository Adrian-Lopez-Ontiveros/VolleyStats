import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { DesktopNav } from "@/components/layout/desktop-nav";
import { UserMenu } from "@/components/layout/user-menu";
import { Button } from "@/components/ui/button";
import { APP_NAME, ROLE_LABELS } from "@/lib/constants";
import type { SessionUser } from "@/lib/types";

export function AppHeader({
  user,
  isAdmin,
  isCoach = false,
  isGuest = false,
}: {
  user: SessionUser | null;
  isAdmin: boolean;
  isCoach?: boolean;
  isGuest?: boolean;
}) {
  return (
    <header className="sticky top-0 z-30 border-b bg-background/90 pt-safe backdrop-blur">
      <div className="app-shell flex h-16 items-center gap-4 lg:h-[4.25rem]">
        <Link href="/noticias" className="flex min-w-0 shrink-0 items-center gap-2.5">
          <BrandMark className="h-12 w-12 md:h-14 md:w-14" />
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-bold tracking-tight md:text-base">{APP_NAME}</p>
            <p className="text-[11px] text-muted-foreground">
              {user ? ROLE_LABELS[user.profile.role] : "Espectador"}
            </p>
          </div>
        </Link>
        <DesktopNav isAdmin={isAdmin} isCoach={isCoach} isGuest={isGuest} />
        <div className="ml-auto shrink-0 lg:ml-0">
          {user ? (
            <UserMenu user={user} />
          ) : (
            <Button asChild size="sm" variant="outline">
              <Link href="/login">Iniciar sesión</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
