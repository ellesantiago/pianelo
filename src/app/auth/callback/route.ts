import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { registerSession, SESSION_COOKIE } from "@/lib/sessions/sessionToken";

/**
 * Exchanges the PKCE `code` Supabase redirects back with -- after an email
 * confirmation link or password reset -- for a real session. Since this can
 * itself produce a live session (unlike the normal AuthForm flow, there's no
 * client-side moment to call /api/session/register), it registers the
 * single-device session token here too.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        const response = NextResponse.redirect(`${origin}${next}`);
        if (user) {
          const token = await registerSession(
            user.id,
            request.headers.get("user-agent")?.slice(0, 120) ?? "Unknown device"
          );
          if (token) {
            response.cookies.set(SESSION_COOKIE, token, {
              httpOnly: true,
              secure: process.env.NODE_ENV === "production",
              sameSite: "lax",
              path: "/",
              maxAge: 60 * 60 * 24 * 365,
            });
          }
        }
        return response;
      }
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth-callback-failed`);
}
