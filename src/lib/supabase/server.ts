import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import {
  isSupabaseConfigured,
  supabaseAnonKey,
  supabaseServiceRoleKey,
  supabaseUrl,
} from "./env";

/**
 * Server-side, request-scoped Supabase client that respects Row Level
 * Security and the current user's session (reads/writes their own cookies).
 * Use this for anything scoped to "the logged-in user" -- their profile,
 * their purchase status, etc.
 */
export async function createSupabaseServerClient() {
  if (!isSupabaseConfigured) return null;

  const cookieStore = await cookies();

  return createServerClient(supabaseUrl!, supabaseAnonKey!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component with no way to set cookies --
          // safe to ignore as long as proxy.ts also refreshes the session
          // (standard @supabase/ssr caveat).
        }
      },
    },
  });
}

/**
 * Privileged, service-role Supabase client. Bypasses Row Level Security --
 * NEVER expose this to the browser. Used for single-device session
 * enforcement (active_sessions) and payment webhook writes (purchases),
 * both of which legitimately need to read/write rows the calling context
 * doesn't have its own authenticated session for.
 */
export function createSupabaseServiceRoleClient() {
  if (!supabaseUrl || !supabaseServiceRoleKey) return null;
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false },
  });
}
