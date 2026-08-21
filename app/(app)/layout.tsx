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
      <AppHeader user={user} isAdmin={isAdmin} isCoach={isCoach} isGuest={isGuest} />
      <main className="app-shell pb-28 pt-5 lg:pb-10 lg:pt-8">{children}</main>
      <BottomNav isAdmin={isAdmin} isCoach={isCoach} isGuest={isGuest} />
    </div>
  );
}
