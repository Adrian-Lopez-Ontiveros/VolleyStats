"use client";

import { WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/lib/constants";

export function OfflineScreen({
  onRetry,
  onContinue,
}: {
  onRetry?: () => void;
  onContinue?: () => void;
}) {
  function retry() {
    if (onRetry) {
      onRetry();
      return;
    }
    window.location.reload();
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
      <div className="mt-8 grid w-full gap-3">
        <Button type="button" size="lg" variant="accent" onClick={retry}>
          Reintentar
        </Button>
        {onContinue ? (
          <Button type="button" size="lg" variant="outline" onClick={onContinue}>
            Seguir con lo guardado en el móvil
          </Button>
        ) : null}
      </div>
    </div>
  );
}
