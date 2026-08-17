import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { UserMenu } from "@/components/layout/user-menu";
import { Button } from "@/components/ui/button";
import { APP_NAME, ROLE_LABELS } from "@/lib/constants";
import type { SessionUser } from "@/lib/types";

export function AppHeader({ user }: { user: SessionUser | null }) {
  return (
    <header className="sticky top-0 z-30 border-b bg-background/90 pt-safe backdrop-blur">
      <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4">
        <Link href="/partidos" className="flex min-w-0 items-center gap-2.5">
          <BrandMark className="h-12 w-12 md:h-14 md:w-14" />
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-bold tracking-tight md:text-base">{APP_NAME}</p>
            <p className="text-[11px] text-muted-foreground">
              {user ? ROLE_LABELS[user.profile.role] : "Espectador"}
            </p>
          </div>
        </Link>
        {user ? (
          <UserMenu user={user} />
        ) : (
          <Button asChild size="sm" variant="outline">
            <Link href="/login">Iniciar sesión</Link>
          </Button>
        )}
      </div>
    </header>
  );
}
