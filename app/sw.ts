/// <reference lib="webworker" />
/// <reference no-default-lib="true" />

import { defaultCache } from "@serwist/next/worker";
import { ExpirationPlugin, NetworkFirst, Serwist } from "serwist";
import type { PrecacheEntry, RuntimeCaching, SerwistGlobalConfig } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

// Read-only offline cache for the teacher module (Phase 1 of offline-first —
// see CLAUDE.md "Offline support (teacher module)"). Deliberately pattern-based
// rather than an explicit URL list, so it doesn't silently miss new teacher
// pages/routes as they're added. Matches GET requests only; everything else
// (all POST/PUT/PATCH/DELETE, and any GET outside these prefixes — including
// /api/admin/** and /api/hod/**) falls through to the NetworkOnly catch-all
// below and fails honestly when offline instead of serving stale data.
const teacherReadOnlyCache: RuntimeCaching = {
  matcher({ request, url }) {
    if (request.method !== "GET") return false;
    return url.pathname.startsWith("/api/teacher/") || url.pathname.startsWith("/api/terms");
  },
  handler: new NetworkFirst({
    cacheName: "teacher-offline-data",
    networkTimeoutSeconds: 4,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 200,
        maxAgeSeconds: 7 * 24 * 60 * 60,
      }),
    ],
  }),
};

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [teacherReadOnlyCache, ...defaultCache],
});

serwist.addEventListeners();
