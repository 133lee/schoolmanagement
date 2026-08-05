"use client";

import { useEffect } from "react";

/**
 * Registers the offline service worker (public/sw.js, built from app/sw.ts).
 * Production only — Serwist itself is configured with `disable` in dev
 * (next.config.ts), so public/sw.js doesn't even exist in a dev build.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.error("Service worker registration failed", error);
    });
  }, []);

  return null;
}
