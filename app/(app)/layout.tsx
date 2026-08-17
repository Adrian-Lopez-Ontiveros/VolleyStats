import { SplashDismiss } from "@/components/app-splash";
import { AppHeader } from "@/components/layout/app-header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { requireViewer } from "@/lib/auth";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isAdmin, isCoach, isGuest } = await requireViewer();

  return (
    <div className="min-h-dvh">
      <AppHeader user={user} />
      <main className="mx-auto w-full max-w-3xl px-4 pb-28 pt-5">{children}</main>
      <BottomNav isAdmin={isAdmin} isCoach={isCoach} isGuest={isGuest} />
      <SplashDismiss />
    </div>
  );
}
