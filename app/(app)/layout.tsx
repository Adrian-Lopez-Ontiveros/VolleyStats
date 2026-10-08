import { CheckinToaster } from "@/components/game/checkin-toaster";
import { AppHeader } from "@/components/layout/app-header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { claimDailyCheckin } from "@/lib/actions/game";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { CheckinResult } from "@/lib/types";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isAdmin, isCoach, isGuest } = await requireViewer();
  let checkin: CheckinResult | null = null;
  let frameId: string | null = null;
  if (user) {
    try {
      checkin = await claimDailyCheckin();
    } catch {
      checkin = null;
    }
    frameId = checkin?.equipped_frame ?? null;
    if (!frameId && !checkin) {
      try {
        const supabase = await createClient();
        const { data } = await supabase
          .from("user_progress")
          .select("equipped_frame")
          .eq("user_id", user.id)
          .maybeSingle();
        const raw = (data as { equipped_frame?: unknown } | null)?.equipped_frame;
        frameId = typeof raw === "string" ? raw : null;
      } catch {
        frameId = null;
      }
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
      <BottomNav
        isAdmin={isAdmin}
        isCoach={isCoach}
        isGuest={isGuest}
        profile={
          user
            ? {
                name: user.profile.full_name,
                avatarUrl: user.profile.avatar_url ?? user.profile.player?.avatar_url ?? null,
                frameId,
              }
            : null
        }
      />
      <CheckinToaster result={checkin} />
    </div>
  );
}
