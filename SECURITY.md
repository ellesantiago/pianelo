# Security model

How Pianelo protects the premium (`full_access`) entitlement, the admin
panel, and user accounts -- and what was found/fixed in the 2026-08-29
security review. Read this before touching auth, payments, or RLS
policies; it explains *why* things are structured this way so a
well-intentioned change doesn't silently reopen a hole.

## The core principle: the database is the real boundary, not the app

Every table in `supabase/migrations/` has Row Level Security (RLS) enabled.
That matters more than anything in `src/` because **Supabase's REST API is
directly reachable by anyone** who has `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_ANON_KEY` -- both are, by design, shipped to every
browser. A logged-in user always holds a valid session JWT for themselves.
That's enough to call `https://<project>.supabase.co/rest/v1/<table>`
directly with curl/devtools, completely bypassing the Next.js app,
`getCurrentUser()`, `requireAdmin()`, every API route -- all of it.

**Consequence:** any check that only exists in `src/` (a `getCurrentUser()`
call, an `if (!user.hasFullAccess)`, an admin gate in a page component) is
UX, not security. The actual security boundary is what RLS policies allow.
If a table's RLS would permit a write via the raw REST API, that write is
possible no matter what the Next.js code does.

## Current RLS posture (by table)

| Table | Client can read | Client can write |
|---|---|---|
| `profiles` | own row only (`auth.uid() = id`) | **nothing** -- no insert/update policy (see incident below) |
| `purchases` | own rows only (`auth.uid() = user_id`) | **nothing** -- no insert/update policy at all; only the service-role key (server-only) writes this table |
| `active_sessions` | nothing | nothing -- service-role only |
| `letter_notes` | everything (`using (true)`) | nothing -- service-role only, via admin API routes |

The `purchases` table is the one that actually matters for premium
bypass, and it's locked down correctly: **no client, technical or not, can
set their own `status` to `'paid'` via a direct database call.** Only two
code paths ever write `status = 'paid'`, both server-only:

1. `src/app/api/payments/webhook/route.ts` -- PayMongo's webhook, gated by
   HMAC-SHA256 signature verification (`PAYMONGO_WEBHOOK_SECRET`) using
   `crypto.timingSafeEqual`. An attacker without that secret cannot forge
   a valid event.
2. `src/app/api/payments/paypal/capture-order/route.ts` -- calls PayPal's
   Orders API directly with `PAYPAL_CLIENT_SECRET` and only marks a
   purchase paid if PayPal's own synchronous response says
   `status === "COMPLETED"`. The client only ever supplies an `orderId`;
   the amount charged always comes from the server-side
   `PRODUCTS.full_access` constant (see `src/lib/payments/products.ts`),
   never from client input. The update is scoped to
   `WHERE user_id = <the caller>`, so one user can never flip another
   user's pending order to paid.

Neither PayMongo nor PayPal integration trusts the browser's word for
"payment succeeded" -- see the comments in `PurchaseModal.tsx` and
`PayPalButton.tsx` for the full reasoning per provider.

## Incident: `profiles.is_admin` self-escalation (fixed 2026-08-29)

**What was wrong:** the original `"profiles: update own"` policy
(`0001_init.sql`) was `for update using (auth.uid() = id)`, with no
`WITH CHECK`. RLS row policies only restrict *which row* an operation can
touch -- they say nothing about *which columns* change. Since `id` isn't
being modified in an update, that check still passes. The practical
result: **any logged-in user could PATCH their own `profiles` row via
Supabase's REST API and set `is_admin: true`**, which `requireAdmin()`
(`src/lib/auth/requireAdmin.ts`) and every admin route trust as ground
truth -- granting full access to `/admin`, `/admin/letter-notes`, and the
admin CRUD API routes, with zero interaction with the Next.js app at all.

**Why the fix is a flat `DROP POLICY` and not a narrower one:** grepping
the whole app (`grep -rn "profiles" src/`) shows the client never performs
a profiles update anywhere -- only `.select()` calls (`getCurrentUser.ts`)
and service-role writes (the admin dashboard's `select("*", {count})`, and
the `handle_new_user` trigger in `0002_profile_trigger.sql`, which runs as
`security definer` and so bypasses RLS entirely). The policy had no
legitimate purpose, so removing it outright (see
`supabase/migrations/0007_lock_down_profiles_update.sql`) is safer than
trying to write a column-restricted version of something nothing uses.

**If you ever add user-editable profile fields** (e.g. a display-name
settings page), do NOT just re-add a blanket `for update using (auth.uid()
= id)` policy. Either:
- Add a `WITH CHECK` that pins the sensitive columns to their old values,
  e.g. `with check (auth.uid() = id and is_admin = (select is_admin from
  public.profiles where id = auth.uid()))`, or
- Use column-level grants: `revoke update on public.profiles from
  authenticated; grant update (display_name) on public.profiles to
  authenticated;` -- then add the row policy on top of that.
Either way, add a regression check (see "How to verify" below) before
merging.

## Admin access (`profiles.is_admin`)

- Checked server-side only, via `requireAdmin()` ->
  `getCurrentUser().isAdmin`, on every admin page/route
  (`src/app/admin/**`, `src/app/api/admin/**`).
- Since the RLS fix above, there is no remaining path for a client to set
  `is_admin` themselves -- it can only be set directly in the database
  (Supabase SQL editor / service role), which is intentional: this app
  has no self-service "become an admin" flow, by design.
- Admin API routes (`api/admin/letter-notes/*`) all call `requireAdmin()`
  before any write and use the service-role client for the actual
  mutation -- confirmed no route skips this check.

## Session / auth

- Auth itself is Supabase Auth (email/password) -- see
  `src/lib/supabase/{client,server}.ts`.
- Single-device login is enforced application-side, not by RLS: every
  request re-validates a `session-token` cookie against the user's single
  row in `active_sessions` (`src/proxy.ts` +
  `src/lib/sessions/sessionToken.ts`). A login elsewhere overwrites that
  row and signs out any request carrying the stale token.
  `active_sessions` has zero client-facing RLS policies (not even read),
  so this can't be tampered with via the REST API either.
- `src/proxy.ts` deliberately exempts `/api/session/register` (issues the
  cookie right after login) and `/auth/callback` (password-recovery
  redirect target) from the single-device check -- see the comments there
  before changing that matcher.

## Secrets & env vars

- Naming convention (keep it consistent when adding new integrations):
  `NEXT_PUBLIC_*` = safe to ship to the browser. Anything else = server-only,
  never read from client components.
- `.env.local` is gitignored and holds real values; `.env.example` is
  tracked and must never contain a real secret, only blank fields or
  non-sensitive defaults (e.g. the price env vars).
- Before taking payments live: re-verify
  `src/app/api/payments/webhook/route.ts`'s signature check against the
  exact snippet PayMongo's dashboard shows for your endpoint (written from
  docs while their site was mid-restructure -- see the comment in that
  file), and confirm `PAYPAL_ENV` is intentionally `live` vs `sandbox`
  before testing PayPal checkout (it charges real money in `live` mode).

## General web-vulnerability posture (checked, not just assumed)

- **XSS:** no `dangerouslySetInnerHTML` anywhere in the codebase (verified
  via repo-wide grep) -- React's default escaping is intact everywhere,
  including admin-authored `letter_notes` content rendered on the
  homepage.
- **SQL injection:** every query goes through Supabase's query builder
  (`.eq()`, `.ilike()`, etc.), which parameterizes values -- no raw SQL
  string concatenation anywhere.
- **SSRF:** the only server-side `fetch()` calls to third parties target
  hardcoded PayMongo/PayPal API hosts (`api.paymongo.com`,
  `api-m.paypal.com` / `api-m.sandbox.paypal.com`) -- never a
  user-supplied URL.
- **CSRF-via-navigation:** every `GET` API route is read-only (`status`,
  `letter-notes/search`, `session/ping`) -- none of them mutate state, so
  simply visiting a crafted link can't trigger an unwanted action.

## How to verify this model hasn't regressed

Run these whenever you touch auth, payments, or a migration:

1. **RLS column-write check:** for every `for update`/`for insert` policy
   in `supabase/migrations/`, ask "could a client change a column that
   matters (is_admin, status, provider_payment_intent_id, amount) while
   still satisfying this policy?" If yes, it's a bug even if the row
   ownership check looks correct.
2. **Grep for the premium flag:** `grep -rn "hasFullAccess\|is_admin" src/`
   -- confirm every place these are *set* (not just read) is a server-only
   file using the service-role client, gated by a real payment
   confirmation (webhook signature, or a direct server-to-server capture
   call) -- never client input.
3. **New payment provider checklist:** if you add a third provider,
   confirm (a) the charged amount comes from a server-side constant, never
   the client, (b) the row update is scoped to the calling user's own
   pending purchase, and (c) either a verified webhook signature or a
   direct authoritative server-to-server confirmation call marks it paid
   -- never the client's own "success" callback alone.
4. Apply pending migrations to your actual Supabase project --
   `supabase/migrations/*.sql` are not applied automatically by deploying
   the app. Run them (SQL editor or `supabase db push`) in order.
