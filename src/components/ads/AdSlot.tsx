"use client";

// Reserved ad placement. Renders nothing until both the AdSense publisher
// ID and this specific slot's unit ID are configured (see .env.example),
// and never for a user who has paid the one-time full-access price (see
// lib/payments/products.ts). Placements are chosen to never sit over the
// piano/controls, mid-recording, or anywhere a stray tap could hit an ad
// instead of a key:
//   - "below-piano"      -- under the piano on the homepage
//   - "footer"           -- site footer, every page
//   - "recordings-rail"  -- side rail on /recordings
//   - "account-rail"     -- side rail on /account
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

  // Ad-blocker extensions target elements with class="adsbygoogle" and strip
  // them from the DOM before React hydrates, which desyncs the server- and
  // client-rendered trees. Gating this on a mounted flag means the ad markup
  // is absent from both the SSR HTML and the first client render -- it's
  // only added in a later, post-hydration update, so there's nothing for an
  // extension to remove before hydration completes.
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
