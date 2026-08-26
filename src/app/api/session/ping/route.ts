import { NextResponse } from "next/server";

// Lightweight endpoint for SessionWatcher to poll. Has no logic of its own --
// src/proxy.ts already runs on this path and redirects instead of letting
// the request reach here if this device's session was invalidated by a
// login elsewhere. Reaching this handler at all means the session is fine.
export async function GET() {
  return NextResponse.json({ ok: true });
}
