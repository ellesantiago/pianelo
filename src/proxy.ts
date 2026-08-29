import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from "@/lib/supabase/env";
import { isSessionValid, SESSION_COOKIE } from "@/lib/sessions/sessionToken";

// Next.js 16 renamed `middleware.ts` -> `proxy.ts` (nodejs runtime only).
// Runs on every request. Refreshes the Supabase auth session cookie, AND
// enforces single-device login: a logged-in request whose session-token
// cookie no longer matches the user's current active_sessions row (because
// they logged in elsewhere since) gets signed out here.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  if (!isSupabaseConfigured) {
    return response;
  }

  const supabase = createServerClient(supabaseUrl!, supabaseAnonKey!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // Refreshing (not just reading) the session is what actually keeps the
  // auth cookies valid -- getUser() triggers a token refresh when needed.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Exempt /api/session/register: it ISSUES the cookie right after login,
  // so there's legitimately no matching cookie yet when it runs.
  const isSessionRegisterRoute = request.nextUrl.pathname.startsWith("/api/session/register");

  // Exempt /auth/callback: a recovery-link click may carry an unrelated,
  // older session cookie that has nothing to do with the code being exchanged.
  const isAuthCallbackRoute = request.nextUrl.pathname.startsWith("/auth/callback");

  if (user && !isSessionRegisterRoute && !isAuthCallbackRoute) {
    const cookieToken = request.cookies.get(SESSION_COOKIE)?.value;
    const valid = await isSessionValid(user.id, cookieToken);

    if (!valid) {
      await supabase.auth.signOut();
      const signedOutResponse = NextResponse.redirect(
        new URL("/login?reason=signed-in-elsewhere", request.url)
      );
      signedOutResponse.cookies.delete(SESSION_COOKIE);
      return signedOutResponse;
    }
  }

  return response;
}

export const config = {
  matcher: [
    // Run on everything except static assets and Next's own internals.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
