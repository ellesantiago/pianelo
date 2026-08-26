"use client";

import { createBrowserClient } from "@supabase/ssr";
import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from "./env";

/**
 * Browser Supabase client. Returns null when the project hasn't been
 * connected yet (no NEXT_PUBLIC_SUPABASE_* env vars) so the rest of the app
 * can render a clear "not configured" state instead of crashing.
 */
export function createSupabaseBrowserClient() {
  if (!isSupabaseConfigured) return null;
  return createBrowserClient(supabaseUrl!, supabaseAnonKey!);
}
