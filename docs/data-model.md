# Data model

All four tables live in one Supabase Postgres project, defined across
`supabase/migrations/0001_init.sql` through `0007_lock_down_profiles_update.sql`.
Row Level Security (RLS) is enabled on every table — see
[SECURITY.md](../SECURITY.md) for why that's the real security boundary,
not anything in `src/`.

Throughout, "service role" means `createSupabaseServiceRoleClient()`
(`src/lib/supabase/server.ts`) — a privileged, server-only client that
bypasses RLS entirely. "Client"/"caller" below means anything using the
anon key: the request-scoped `createSupabaseServerClient()`, or a
hypothetical direct call to Supabase's REST API from the browser.

## `profiles`

One row per Supabase Auth user (`auth.users`), auto-created by the
`handle_new_user()` trigger (`0002_profile_trigger.sql`, `security
definer`, so it runs regardless of RLS) on signup.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | = `auth.users.id` |
| `display_name` | `text` | from signup metadata; not currently editable anywhere |
| `is_admin` | `boolean` | grants `/admin` access — see `requireAdmin()` |
| `deleted_at` | `timestamptz` | soft-delete marker; `getCurrentUser()` returns `null` if set |
| `created_at` / `updated_at` | `timestamptz` | |

**RLS:** `select` where `auth.uid() = id` (read own row only). **No
insert/update policy** — as of `0007_lock_down_profiles_update.sql`, a
client cannot write to this table at all; only the service role (the
`handle_new_user` trigger, and any future admin tooling) can. This was a
fix: the original `0001` policy allowed a client to update *any* column
on their own row, including `is_admin` — see the incident write-up in
[SECURITY.md](../SECURITY.md).

## `active_sessions`

Single-device login enforcement. Exactly one row per user; a new login
overwrites it.

| Column | Type | Notes |
|---|---|---|
| `user_id` | `uuid` PK | references `auth.users` |
| `session_token` | `uuid` | compared against the request's cookie on every request (`src/proxy.ts`) |
| `device_label` | `text` | truncated `User-Agent` of the logging-in device |
| `last_seen_at` / `created_at` | `timestamptz` | |

**RLS: no policies at all** — not even `select`. Only the service role
(via `registerSession()` in `src/lib/sessions/sessionToken.ts`, called
from `POST /api/session/register`) ever touches this table. A client
cannot read or forge another device's session state.

## `purchases`

The `full_access` entitlement ledger. One row per checkout attempt (not
per user) — a user can have multiple `pending`/`failed` rows from retries
before one succeeds.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `user_id` | `uuid` | references `auth.users` |
| `product` | `text` | `check (product in ('full_access'))` — was two products (`content_unlock`, `remove_ads`) before `0005_single_product.sql` merged them |
| `provider` | `text` | `check (provider in ('paymongo', 'paypal'))` (widened in `0006_paypal_provider.sql`) |
| `provider_payment_intent_id` | `text` | PayMongo Payment Intent id, **or** PayPal Order id — deliberately provider-agnostic, indexed |
| `status` | `text` | `check (status in ('pending', 'paid', 'failed'))` |
| `amount` / `currency` | `numeric` / `text` | `149.00`/`'PHP'` for PayMongo, or the USD price/`'USD'` for PayPal — see [payments.md](./payments.md) for why summing this column blindly across rows is wrong (the admin dashboard splits by `currency`) |
| `paid_at` | `timestamptz` | set only when `status` becomes `'paid'` |
| `created_at` / `updated_at` | `timestamptz` | |

**RLS:** `select` where `auth.uid() = user_id` (read own purchases only,
e.g. so a future "purchase history" UI could read this directly).
**No insert/update policy whatsoever** — a client cannot create or modify
a purchases row under any circumstances. Every write comes from a
server-only route using the service role:
- `POST /api/payments/checkout` — inserts a `pending` row (PayMongo).
- `POST /api/payments/paypal/create-order` — inserts a `pending` row
  (PayPal).
- `POST /api/payments/webhook` — the only thing that sets a PayMongo row
  to `paid`/`failed`, gated by HMAC signature verification.
- `POST /api/payments/paypal/capture-order` — the only thing that sets a
  PayPal row to `paid`, gated by a direct, authoritative capture call to
  PayPal's API.

`getCurrentUser().hasFullAccess` is simply
`purchases.some(row => row.product === 'full_access')` filtered to
`status = 'paid'` — provider-agnostic by construction, so adding a third
payment provider later needs no change there.

## `letter_notes`

Admin-curated song content.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `title` | `text` | |
| `notes` | `text` | space-separated tokens; see `validateLetterNotesInput` in [architecture.md](./architecture.md#the-letter-notes-subsystem) for the format |
| `created_at` / `updated_at` | `timestamptz` | |

**RLS:** `select using (true)` — anyone (including an unauthenticated
direct REST call) can read every row's `title` **and `notes`**. The
paywall (only paying users see `notes`) is enforced entirely by
`GET /api/letter-notes/search` nulling out the `notes` field
server-side before responding — **not** by RLS. This is intentional per
the code comments (letter-notes content isn't sensitive data, unlike
payment/session state), but it does mean the raw table is not itself
access-controlled — don't rely on RLS here if the threat model for this
table ever changes. **No insert/update/delete policy** — only the service
role, via the admin CRUD routes (`requireAdmin()`-gated), writes this
table.
