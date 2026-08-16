"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { WifiOff } from "lucide-react";
import { readQueue, subscribeQueue } from "@/lib/offline-queue";

export function OfflineBanner() {
  const [online, setOnline] = useState(true);
  const queued = useSyncExternalStore(subscribeQueue, () => readQueue().length, () => 0);

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

  if (online && queued === 0) return null;

  return (
    <div className="print-hidden sticky top-0 z-40 bg-amber-500 px-4 py-2 text-center text-xs font-semibold text-amber-950">
      <span className="inline-flex items-center gap-1.5">
        {!online ? <WifiOff className="h-3.5 w-3.5" /> : null}
        {!online
          ? queued
            ? `Sin conexión. ${queued} acción${queued === 1 ? "" : "es"} pendiente${queued === 1 ? "" : "s"} de sincronizar.`
            : "Sin conexión. Puedes seguir anotando; se guardará en este dispositivo."
          : `Conexión recuperada. Sincronizando ${queued} acción${queued === 1 ? "" : "es"}…`}
      </span>
    </div>
  );
}
