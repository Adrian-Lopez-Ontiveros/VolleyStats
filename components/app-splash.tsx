"use client";

import { useEffect } from "react";

const MIN_MS = 400;
const MAX_MS = 3500;

let hideStarted = false;

export function hideAppSplash() {
  if (hideStarted || typeof document === "undefined") return;
  hideStarted = true;

  const el = document.getElementById("app-splash");
  document.documentElement.classList.add("app-ready");
  if (!el) return;

  const started = Number((window as Window & { __splashAt?: number }).__splashAt);
  const elapsed = Number.isFinite(started) ? Date.now() - started : MIN_MS;
  const wait = Math.max(0, Math.min(MIN_MS - elapsed, 800));

  window.setTimeout(() => {
    el.classList.add("app-splash-hide");
    window.setTimeout(() => el.remove(), 450);
  }, wait);
}

export function SplashDismiss() {
  useEffect(() => {
    const ready = () => hideAppSplash();
    window.setTimeout(ready, MAX_MS);

    if (document.readyState === "complete") {
      ready();
    } else {
      window.addEventListener("load", ready, { once: true });
    }
  }, []);

  return null;
}
