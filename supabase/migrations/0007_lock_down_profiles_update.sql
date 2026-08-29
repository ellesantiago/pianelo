-- SECURITY FIX: the "profiles: update own" policy (0001_init.sql) let any
-- authenticated user update ANY column on their own profiles row via a
-- direct call to Supabase's REST API (using the public anon key + their own
-- session JWT) -- including is_admin, a straightforward self-service
-- privilege escalation to full admin access (see /admin, requireAdmin.ts).
-- RLS only restricts which ROW you can touch, not which COLUMNS, so
-- "auth.uid() = id" alone does nothing to stop this.
--
-- Nothing in the app ever performs a client-side profiles update -- only
-- reads (getCurrentUser.ts) and service-role writes (admin/page.tsx's
-- counts, the handle_new_user trigger) -- so the policy has no legitimate
-- use and is dropped outright rather than narrowed.

drop policy if exists "profiles: update own" on public.profiles;
