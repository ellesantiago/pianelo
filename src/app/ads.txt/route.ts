import { NextResponse } from "next/server";

// Served dynamically (not a static public/ads.txt) so it always reflects
// whatever NEXT_PUBLIC_ADSENSE_CLIENT_ID is actually configured, rather than
// a hardcoded publisher ID going stale. AdSense checks for this at
// https://<site>/ads.txt once an account exists, and during review.
export async function GET() {
  const clientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;
  const pubId = clientId?.replace(/^ca-/, "");
  const body = pubId ? `google.com, ${pubId}, DIRECT, f08c47fec0942fa0\n` : "";

  return new NextResponse(body, { headers: { "Content-Type": "text/plain" } });
}
