"use client";

// Reserved ad placement. Renders nothing until both the AdSense publisher
// ID and this slot's unit ID are configured, and never for a user who has
// paid for full access. Placements avoid the piano/controls so a stray
// tap can't hit an ad instead of a key.
import { useEffect, useRef, useState } from "react";

const ADSENSE_CLIENT_ID = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

interface AdSlotProps {
  slot: "below-piano" | "footer" | "recordings-rail" | "account-rail";
  hidden?: boolean;
  className?: string;
}

export function AdSlot({ slot, hidden, className }: AdSlotProps) {
  const envKey = `NEXT_PUBLIC_ADSENSE_SLOT_${slot.toUpperCase().replace(/-/g, "_")}`;
  const slotId = process.env[envKey as keyof NodeJS.ProcessEnv];
  const pushed = useRef(false);
  const show = !hidden && Boolean(ADSENSE_CLIENT_ID) && Boolean(slotId);

  // Ad blockers strip class="adsbygoogle" before hydration, desyncing the
  // server/client trees -- gating on a mounted flag keeps the ad markup out
  // of both the SSR HTML and the first client render entirely.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted || !show || pushed.current) return;
    pushed.current = true;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // AdSense not available (blocked, offline, etc.) -- fail silently.
    }
  }, [mounted, show]);

  if (!mounted || !show) return null;

  return (
    <div className={`flex justify-center overflow-hidden ${className ?? ""}`}>
      <ins
        className="adsbygoogle"
        style={{ display: "block", width: "100%" }}
        data-ad-client={ADSENSE_CLIENT_ID}
        data-ad-slot={slotId}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
