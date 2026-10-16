"use client";

import { Button } from "@/components/ui/button";
import { usePushSubscription } from "@/components/profile/use-push-subscription";

/**
 * Botón antiguo de avisos (ya no se muestra en Perfil; Ajustes usa el mismo hook
 * `usePushSubscription` con su interruptor maestro).
 */
export function NotificationToggle({ enabled }: { enabled: boolean }) {
  const { on, pending, toggle } = usePushSubscription(enabled);
  return (
    <div className="rounded-2xl border bg-card p-4">
      <p className="text-sm font-semibold">Notificaciones</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Instala la app para recibirlas con el móvil bloqueado.
      </p>
      <Button
        type="button"
        size="sm"
        variant={on ? "secondary" : "outline"}
        className="mt-3"
        disabled={pending}
        onClick={() => void toggle()}
      >
        {pending ? "Guardando..." : on ? "Avisos activados" : "Activar avisos"}
      </Button>
    </div>
  );
}
