import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { registerSession, SESSION_COOKIE } from "@/lib/sessions/sessionToken";

/**
 * Called by AuthForm right after a successful login/signup. Issues a new
 * session token, records it as the user's one active session (overwriting
 * any previous device's row -- see lib/sessions/sessionToken.ts), and sets
 * it as an httpOnly cookie. proxy.ts compares this cookie against the
 * active_sessions row on every subsequent request.
 */
export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const deviceLabel = request.headers.get("user-agent")?.slice(0, 120) ?? "Unknown device";
  const token = await registerSession(user.id, deviceLabel);
  if (!token) {
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}
