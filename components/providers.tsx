"use client";

import { Toaster } from "@/components/ui/sonner";
import { OfflineBanner } from "@/components/offline-banner";
import { PwaRegister } from "@/components/pwa-register";
import { SplashDismiss } from "@/components/app-splash";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SplashDismiss />
      <OfflineBanner />
      {children}
      <Toaster />
      <PwaRegister />
    </>
  );
}
