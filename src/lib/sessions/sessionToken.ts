import { randomUUID } from "crypto";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

// Single-device login enforcement: one active_sessions row per user, holding
// whichever session_token was issued most recently. Logging in on a new
// device overwrites the row -- the OLD device's cookie no longer matches on
// its next request, so it gets signed out there (see src/proxy.ts). This is
// intentionally simple: no explicit "kick" push to the old device, just a
// mismatch check on its next request.
export const SESSION_COOKIE = "pianelo_session_token";

/** Issues a new session token for a user and records it as their one active session. */
export async function registerSession(
  userId: string,
  deviceLabel: string
): Promise<string | null> {
  const service = createSupabaseServiceRoleClient();
  if (!service) return null;

  const token = randomUUID();
  const { error } = await service.from("active_sessions").upsert(
    {
      user_id: userId,
      session_token: token,
      device_label: deviceLabel,
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
  if (error) return null;
  return token;
}

/**
 * Checks whether a session-token cookie is still the current one for a user.
 * Fails OPEN (returns true) when Supabase/the service role isn't configured
 * yet, so local/demo setup isn't blocked by a feature that needs a real
 * database -- once configured, an actual mismatch fails closed (signs out).
 */
export async function isSessionValid(userId: string, token: string | undefined): Promise<boolean> {
  const service = createSupabaseServiceRoleClient();
  if (!service) return true;
  if (!token) return false;

  const { data } = await service
    .from("active_sessions")
    .select("session_token")
    .eq("user_id", userId)
    .maybeSingle();

  return data?.session_token === token;
}
