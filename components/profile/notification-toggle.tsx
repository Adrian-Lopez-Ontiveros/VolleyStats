"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  deletePushSubscription,
  savePushSubscription,
  setMatchEndNotifications,
} from "@/lib/actions/notifications";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

export function NotificationToggle({ enabled }: { enabled: boolean }) {
  const [on, setOn] = useState(enabled);
  const [pending, setPending] = useState(false);

  async function toggle() {
    setPending(true);
    const next = !on;
    try {
      if (next) {
        if (!("Notification" in window) || !("serviceWorker" in navigator)) {
          toast.error("Este dispositivo no admite notificaciones.");
          return;
        }
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          toast.error("Necesitamos permiso para avisarte.");
          return;
        }
        const registration = await navigator.serviceWorker.ready;
        const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (publicKey && registration.pushManager) {
          const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey),
          });
          const json = subscription.toJSON();
          if (json.endpoint && json.keys?.p256dh && json.keys.auth) {
            const saved = await savePushSubscription({
              endpoint: json.endpoint,
              p256dh: json.keys.p256dh,
              auth: json.keys.auth,
            });
            if (saved.error) {
              toast.error(saved.error);
              return;
            }
          }
        }
      } else if ("serviceWorker" in navigator) {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager?.getSubscription();
        if (subscription) {
          await deletePushSubscription(subscription.endpoint);
          await subscription.unsubscribe();
        }
      }

      const result = await setMatchEndNotifications(next);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setOn(next);
      toast.success(next ? "Avisos de resultado activados" : "Avisos desactivados");
    } catch {
      toast.error("No se pudo actualizar la preferencia.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-2xl border bg-card p-4">
      <p className="text-sm font-semibold">Notificaciones de resultado</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Te avisamos cuando termine un partido de tu equipo. Funciona también si tienes la
        app instalada.
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
