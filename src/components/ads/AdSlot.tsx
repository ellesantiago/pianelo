// Reserved ad placement. Renders nothing until both the AdSense publisher
// ID and this specific slot's unit ID are configured (see .env.example),
// and never for a user who has paid the one-time ₱99. Placements are chosen
// to never sit over the piano/controls, mid-recording, or anywhere a stray
// tap could hit an ad instead of a key:
//   - "below-piano"      -- under the piano on the homepage
//   - "footer"           -- site footer, every page
//   - "recordings-rail"  -- side rail on /recordings
//   - "account-rail"     -- side rail on /account
const ADSENSE_CLIENT_ID = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;

interface AdSlotProps {
  slot: "below-piano" | "footer" | "recordings-rail" | "account-rail";
  hidden?: boolean;
  className?: string;
}

export function AdSlot({ slot, hidden, className }: AdSlotProps) {
  const envKey = `NEXT_PUBLIC_ADSENSE_SLOT_${slot.toUpperCase().replace(/-/g, "_")}`;
  const slotId = process.env[envKey as keyof NodeJS.ProcessEnv];

  if (hidden || !ADSENSE_CLIENT_ID || !slotId) return null;

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
      <script
        dangerouslySetInnerHTML={{
          __html: "(adsbygoogle = window.adsbygoogle || []).push({});",
        }}
      />
    </div>
  );
}
