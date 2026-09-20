"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { WifiOff } from "lucide-react";
import { OfflineScreen } from "@/components/offline-screen";
import { readQueue, subscribeQueue } from "@/lib/offline-queue";

function useOnline() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  return online;
}

function isLiveTrackingPath(pathname: string) {
  return /\/partidos\/[^/]+\/seguimiento\/?$/.test(pathname);
}

export function OfflineBanner() {
  const online = useOnline();
  const queued = useSyncExternalStore(subscribeQueue, () => readQueue().length, () => 0);
  const [pathname, setPathname] = useState("");
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setPathname(window.location.pathname);
  }, []);

  useEffect(() => {
    if (online) setDismissed(false);
  }, [online]);

  const live = isLiveTrackingPath(pathname);
  const blocking = !online && !live && !dismissed;

  if (blocking) {
    return (
      <div className="print-hidden fixed inset-0 z-[80] overflow-auto bg-background">
        <OfflineScreen onContinue={() => setDismissed(true)} />
      </div>
    );
  }

  if (online && queued === 0) return null;

  return (
    <div className="print-hidden sticky top-0 z-40 bg-amber-500 px-4 py-2.5 text-center text-xs font-semibold text-amber-950">
      <span className="inline-flex items-center gap-1.5">
        {!online ? <WifiOff className="h-3.5 w-3.5 shrink-0" /> : null}
        {!online
          ? queued
            ? `Sin internet. El fallo es la conexión. ${queued} acción${queued === 1 ? "" : "es"} pendiente${queued === 1 ? "" : "s"}.`
            : "Sin internet. El fallo es la conexión, no la app. Activa Wi‑Fi o datos."
          : `Conexión recuperada. Sincronizando ${queued} acción${queued === 1 ? "" : "es"}…`}
      </span>
    </div>
  );
}
