"use client";

import { useEffect } from "react";

const POLL_INTERVAL_MS = 20_000;

/**
 * Detects "signed in elsewhere" without waiting for this tab to make its own
 * navigation. Polls a lightweight endpoint that src/proxy.ts already guards:
 * if a newer login invalidated this device's session, proxy.ts redirects the
 * request instead of letting it reach the route handler, which shows up here
 * as an opaque (unfollowed) redirect response.
 */
export function SessionWatcher() {
  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      try {
        const res = await fetch("/api/session/ping", {
          cache: "no-store",
          redirect: "manual",
        });
        if (!cancelled && res.type === "opaqueredirect") {
          window.location.href = "/login?reason=signed-in-elsewhere";
        }
      } catch {
        // Network hiccup -- just try again on the next tick/focus.
      }
    };

    const interval = setInterval(check, POLL_INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") void check();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", check);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", check);
    };
  }, []);

  return null;
}
