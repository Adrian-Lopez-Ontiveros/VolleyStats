"use client";

import { useEffect } from "react";

const MIN_MS = 400;
const MAX_MS = 800;

let hideStarted = false;

declare global {
  interface Window {
    __splashAt?: number;
    __hideSplash?: () => void;
  }
}

function hideAppSplash() {
  if (hideStarted || typeof document === "undefined") return;
  hideStarted = true;

  if (typeof window.__hideSplash === "function") {
    window.__hideSplash();
    return;
  }

  const el = document.getElementById("app-splash");
  document.documentElement.classList.add("app-ready");
  if (!el) return;

  el.classList.add("app-splash-hide");
  window.setTimeout(() => el.remove(), 400);
}

export function SplashDismiss() {
  useEffect(() => {
    const started = Number(window.__splashAt);
    const elapsed = Number.isFinite(started) ? Date.now() - started : MIN_MS;
    const wait = Math.max(0, MIN_MS - elapsed);

    const ready = () => window.setTimeout(hideAppSplash, wait);
    const cap = window.setTimeout(hideAppSplash, MAX_MS);

    if (document.readyState === "complete") {
      ready();
    } else {
      window.addEventListener("load", ready, { once: true });
    }

    return () => window.clearTimeout(cap);
  }, []);

  return null;
}
