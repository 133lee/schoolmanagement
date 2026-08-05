"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

/**
 * Shown only while the browser reports no network connection. Exists so a
 * teacher viewing service-worker-cached data (timetable, rosters, results —
 * see app/sw.ts) never mistakes it for live data.
 */
export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(
    () => typeof navigator !== "undefined" && !navigator.onLine
  );

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="fixed bottom-16 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full border bg-background px-4 py-2 text-sm shadow-lg lg:bottom-4">
      <WifiOff className="h-4 w-4 text-muted-foreground" />
      <span>You&apos;re offline — showing last-saved data</span>
    </div>
  );
}
