"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { deletePushSubscription, savePushSubscription } from "@/lib/actions/notifications";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

/**
 * Lógica compartida del interruptor maestro de avisos: permiso del navegador, suscripción
 * push y guardar/borrar la suscripción en Supabase. `initial` = el usuario ya tiene alguna
 * suscripción guardada; en el cliente se refina con la de este navegador.
 */
export function usePushSubscription(initial: boolean) {
  const [on, setOn] = useState(initial);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    let cancelled = false;
    void navigator.serviceWorker.getRegistration().then(async (registration) => {
      const subscription = await registration?.pushManager?.getSubscription();
      if (!cancelled && registration?.pushManager && "Notification" in window) {
        setOn(Boolean(subscription) && Notification.permission === "granted");
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function enable() {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      toast.error("Este dispositivo no admite notificaciones.");
      return false;
    }
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      toast.error("Necesitamos permiso para avisarte.");
      return false;
    }
    const registration = await navigator.serviceWorker.ready;
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicKey || !registration.pushManager) {
      toast.error("Este dispositivo no admite notificaciones.");
      return false;
    }
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
    const json = subscription.toJSON();
    if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) return false;
    const saved = await savePushSubscription({
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
    });
    if (saved.error) {
      toast.error(saved.error);
      return false;
    }
    return true;
  }

  async function disable() {
    if ("serviceWorker" in navigator) {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager?.getSubscription();
      if (subscription) {
        await deletePushSubscription(subscription.endpoint);
        await subscription.unsubscribe();
      }
    }
    return true;
  }

  async function toggle(next = !on) {
    setPending(true);
    try {
      const ok = next ? await enable() : await disable();
      if (ok) {
        setOn(next);
        toast.success(next ? "Notificaciones activadas" : "Notificaciones desactivadas");
      }
    } catch {
      toast.error("No se pudo actualizar la preferencia.");
    } finally {
      setPending(false);
    }
  }

  return { on, pending, toggle };
}
