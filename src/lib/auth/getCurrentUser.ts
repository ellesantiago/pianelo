import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface CurrentUser {
  id: string;
  email: string | null;
  isAdmin: boolean;
  /** Paid the one-time ₱149 for letter notes + recording. */
  hasContentUnlock: boolean;
  /** Paid the one-time ₱99 to remove ads. */
  hasAdsRemoved: boolean;
}

/**
 * Server-only helper: who's logged in, what they've bought, are they an
 * admin. Returns null for a guest OR a soft-deleted account. The piano
 * itself isn't gated here -- it's free to any logged-in user, so callers
 * only need `id`/`email` truthiness for that.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: profile }, { data: purchases }] = await Promise.all([
    supabase.from("profiles").select("is_admin, deleted_at").eq("id", user.id).maybeSingle(),
    supabase
      .from("purchases")
      .select("product")
      .eq("user_id", user.id)
      .eq("status", "paid"),
  ]);

  if (profile?.deleted_at) return null;

  const paidProducts = new Set((purchases ?? []).map((row) => row.product));

  return {
    id: user.id,
    email: user.email ?? null,
    isAdmin: profile?.is_admin ?? false,
    hasContentUnlock: paidProducts.has("content_unlock"),
    hasAdsRemoved: paidProducts.has("remove_ads"),
  };
}
