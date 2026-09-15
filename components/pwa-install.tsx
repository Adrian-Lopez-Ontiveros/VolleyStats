"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Share, Smartphone, SquarePlus, X } from "lucide-react";
import { APP_NAME } from "@/lib/constants";
import { Button } from "@/components/ui/button";

const DISMISS_KEY = "fuenla-pwa-hide";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandalone() {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return Boolean(nav.standalone);
}

function isIos() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isDismissed() {
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

export function PwaInstallPrompt() {
  const pathname = usePathname();
  const deferred = useRef<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [guide, setGuide] = useState(false);
  const [canPrompt, setCanPrompt] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    if (isStandalone() || isDismissed()) return;

    setIos(isIos());
    setVisible(true);

    const onPrompt = (event: Event) => {
      event.preventDefault();
      deferred.current = event as BeforeInstallPromptEvent;
      setCanPrompt(true);
      setVisible(true);
    };
    const onInstalled = () => {
      deferred.current = null;
      setVisible(false);
      setGuide(false);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  function dismiss() {
    setVisible(false);
    setGuide(false);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
  }

  async function install() {
    const event = deferred.current;
    if (!event) {
      setGuide(true);
      return;
    }
    await event.prompt();
    const choice = await event.userChoice;
    if (choice.outcome === "accepted") {
      setVisible(false);
      setGuide(false);
    }
  }

  if (!visible) return null;

  return (
    <>
      <div
        className={
          pathname === "/" ||
          pathname === "/login" ||
          pathname === "/registro" ||
          pathname.startsWith("/recuperar") ||
          pathname.startsWith("/actualizar")
            ? "fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(1rem,env(safe-area-inset-bottom))]"
            : "fixed inset-x-0 bottom-0 z-40 px-3 pb-[calc(5.25rem+env(safe-area-inset-bottom))] lg:pb-4"
        }
      >
        <div className="mx-auto flex max-w-lg items-start gap-3 rounded-2xl border border-orange-200 bg-white p-3 shadow-lg">
          <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-700">
            <Smartphone className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-tight">Instala {APP_NAME} en el móvil</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Ábrela como una app, sin navegador. Más rápida y con avisos de partido.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {canPrompt ? (
                <Button type="button" size="sm" variant="accent" onClick={() => void install()}>
                  Instalar
                </Button>
              ) : (
                <Button type="button" size="sm" variant="accent" onClick={() => setGuide(true)}>
                  Cómo se instala
                </Button>
              )}
              <Button type="button" size="sm" variant="ghost" onClick={dismiss}>
                Ahora no
              </Button>
            </div>
          </div>
          <button
            type="button"
            onClick={dismiss}
            className="rounded-lg p-1 text-muted-foreground hover:bg-secondary"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {guide ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-3 sm:items-center">
          <div className="w-full max-w-md rounded-3xl bg-background p-5 shadow-lg">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-lg font-bold">Cómo instalarla</p>
                <p className="text-sm text-muted-foreground">
                  {ios
                    ? "En iPhone o iPad, con Safari:"
                    : "En Android, con Chrome (o el navegador del móvil):"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setGuide(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-secondary"
                aria-label="Cerrar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {ios ? (
              <ol className="space-y-3 text-sm">
                <li className="flex gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-700">
                    <Share className="h-4 w-4" />
                  </span>
                  <span>
                    Pulsa el botón <strong>Compartir</strong> (el cuadrado con la flecha hacia
                    arriba) en la barra de Safari.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-700">
                    <SquarePlus className="h-4 w-4" />
                  </span>
                  <span>
                    Baja y elige <strong>Añadir a pantalla de inicio</strong>. Confirma con Añadir.
                  </span>
                </li>
              </ol>
            ) : (
              <ol className="space-y-3 text-sm">
                <li className="flex gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-orange-100 font-bold text-orange-700">
                    1
                  </span>
                  <span>
                    Abre el menú del navegador (los tres puntos <strong>⋮</strong> arriba a la
                    derecha).
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-orange-100 font-bold text-orange-700">
                    2
                  </span>
                  <span>
                    Pulsa <strong>Instalar aplicación</strong> o{" "}
                    <strong>Añadir a la pantalla de inicio</strong>.
                  </span>
                </li>
              </ol>
            )}

            <p className="mt-4 text-xs text-muted-foreground">
              Si estás en el ordenador, abre esta misma web en el móvil y sigue esos pasos. Luego
              verás el icono de {APP_NAME} junto al resto de apps.
            </p>

            <div className="mt-4 flex gap-2">
              {canPrompt ? (
                <Button type="button" variant="accent" className="flex-1" onClick={() => void install()}>
                  Instalar ahora
                </Button>
              ) : null}
              <Button type="button" variant="outline" className="flex-1" onClick={() => setGuide(false)}>
                Entendido
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
