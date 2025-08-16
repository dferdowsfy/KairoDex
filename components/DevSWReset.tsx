"use client";

import { useEffect } from "react";

/**
 * DevSWReset: In development, aggressively unregisters any active service workers
 * and clears caches so the Next.js dev server isn't controlled by a stale PWA.
 */
export default function DevSWReset() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    if (typeof window === "undefined") return;

    const reset = async () => {
      try {
        if ("serviceWorker" in navigator) {
          const regs = await navigator.serviceWorker.getRegistrations();
          await Promise.all(
            regs.map(async (reg) => {
              try {
                await reg.unregister();
              } catch {}
            })
          );
        }
        if ("caches" in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((k) => caches.delete(k)));
        }
      } catch {
        // no-op: best-effort cleanup
      }
    };

    reset();
  }, []);

  return null;
}
