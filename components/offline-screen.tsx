"use client";

import { useState } from "react";
import { WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/lib/constants";

async function hasInternet() {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return false;
  try {
    const response = await fetch(`/api/health?t=${Date.now()}`, {
      method: "GET",
      cache: "no-store",
    });
    if (!response.ok) return false;
    const body = (await response.json().catch(() => null)) as { ok?: boolean } | null;
    return body?.ok === true;
  } catch {
    return false;
  }
}

export function OfflineScreen({ onContinue }: { onContinue?: () => void }) {
  const [pending, setPending] = useState(false);
  const [stillOffline, setStillOffline] = useState(false);

  async function retry() {
    setPending(true);
    setStillOffline(false);
    const online = await hasInternet();
    if (!online) {
      if (window.location.pathname !== "/offline.html") {
        window.location.replace("/offline.html");
        return;
      }
      setPending(false);
      setStillOffline(true);
      return;
    }
    window.location.replace("/");
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-6 py-10 text-center">
      <span className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-amber-800">
        <WifiOff className="h-8 w-8" />
      </span>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">{APP_NAME}</p>
      <h1 className="mt-2 text-2xl font-black tracking-tight">No hay internet</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        El fallo no es de la app: este móvil no tiene conexión. Activa el Wi‑Fi o los
        datos móviles y vuelve a entrar.
      </p>
      {stillOffline ? (
        <p className="mt-3 text-sm font-semibold text-amber-800">
          Sigue sin internet. Comprueba el Wi‑Fi o los datos y prueba otra vez.
        </p>
      ) : null}
      <div className="mt-8 grid w-full gap-3">
        <Button type="button" size="lg" variant="accent" onClick={retry} disabled={pending}>
          {pending ? "Comprobando..." : "Reintentar"}
        </Button>
        {onContinue ? (
          <Button type="button" size="lg" variant="outline" onClick={onContinue} disabled={pending}>
            Seguir con lo guardado en el móvil
          </Button>
        ) : null}
      </div>
    </div>
  );
}
