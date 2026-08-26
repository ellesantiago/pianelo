import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface CurrentUser {
  id: string;
  email: string | null;
  isAdmin: boolean;
  /** Whether this user has a completed, paid one-time ₱99 purchase. */
  hasPurchased: boolean;
}

/**
 * Server-only helper: who's logged in, have they paid, are they an admin.
 * Returns null for a guest OR a soft-deleted account.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: profile }, { data: purchase }] = await Promise.all([
    supabase.from("profiles").select("is_admin, deleted_at").eq("id", user.id).maybeSingle(),
    supabase
      .from("purchases")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "paid")
      .limit(1)
      .maybeSingle(),
  ]);

  if (profile?.deleted_at) return null;

  return {
    id: user.id,
    email: user.email ?? null,
    isAdmin: profile?.is_admin ?? false,
    hasPurchased: Boolean(purchase),
  };
}
