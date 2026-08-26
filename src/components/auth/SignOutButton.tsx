"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const handleSignOut = async () => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;
    await supabase.auth.signOut();
    // Full navigation, not router.push -- see AuthForm.tsx for why
    // router.push can still serve a stale, pre-logout Router Cache entry.
    window.location.href = "/";
  };

  return (
    <button type="button" onClick={handleSignOut} className="hover:text-neutral-900">
      Log out
    </button>
  );
}
