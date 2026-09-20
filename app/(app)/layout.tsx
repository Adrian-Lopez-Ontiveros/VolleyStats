import { CheckinToaster } from "@/components/game/checkin-toaster";
import { AppHeader } from "@/components/layout/app-header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { claimDailyCheckin } from "@/lib/actions/game";
import { requireViewer } from "@/lib/auth";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isAdmin, isCoach, isGuest } = await requireViewer();
  let checkin = null;
  if (user) {
    try {
      checkin = await claimDailyCheckin();
    } catch {
      checkin = null;
    }
  }

  return (
    <div className="min-h-dvh">
      <AppHeader
        user={user}
        isAdmin={isAdmin}
        isCoach={isCoach}
        isGuest={isGuest}
        streak={checkin?.streak ?? 0}
      />
      <main className="app-shell pb-28 pt-5 lg:pb-10 lg:pt-8">{children}</main>
      <BottomNav isAdmin={isAdmin} isCoach={isCoach} isGuest={isGuest} />
      <CheckinToaster result={checkin} />
    </div>
  );
}
