"use client";

import { Toaster } from "@/components/ui/sonner";
import { PwaRegister } from "@/components/pwa-register";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster />
      <PwaRegister />
    </>
  );
}
