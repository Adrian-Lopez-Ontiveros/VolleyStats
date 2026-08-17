"use client";

import { useEffect } from "react";

const MIN_MS = 650;
const MAX_MS = 2800;

let hideStarted = false;

function splashStartedAt() {
  const marked = Number((window as Window & { __splashAt?: number }).__splashAt);
  return Number.isFinite(marked) && marked > 0 ? marked : performance.now();
}

export function hideAppSplash() {
  if (hideStarted || typeof document === "undefined") return;
  const el = document.getElementById("app-splash");
  if (!el) {
    hideStarted = true;
    document.documentElement.classList.add("app-ready");
    return;
  }

  const wait = Math.max(0, MIN_MS - (performance.now() - splashStartedAt()));
  window.setTimeout(() => {
    if (hideStarted) return;
    hideStarted = true;
    el.classList.add("app-splash-hide");
    document.documentElement.classList.add("app-ready");
    window.setTimeout(() => el.remove(), 500);
  }, wait);
}

export function SplashDismiss() {
  useEffect(() => {
    const onReady = () => hideAppSplash();
    const max = window.setTimeout(onReady, MAX_MS);

    if (document.readyState === "complete") {
      requestAnimationFrame(() => requestAnimationFrame(onReady));
    } else {
      window.addEventListener("load", onReady, { once: true });
    }

    return () => {
      window.clearTimeout(max);
      window.removeEventListener("load", onReady);
    };
  }, []);

  return null;
}
