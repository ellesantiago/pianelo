# Routes

Every page and API route, and exactly what gates access to it. "Gate"
here means a real server-side check — see [SECURITY.md](../SECURITY.md)
for why a page-level redirect alone would never be enough.

## Pages

| Route | Access | Notes |
|---|---|---|
| `/` | Public | Free piano, no login. `getCurrentUser()` is still called to pass `isLoggedIn`/`hasFullAccess` down (gates the Record button and ad visibility), but never redirects a guest. |
| `/pricing` | Public | Shows the free tier and the `full_access` price(s); `PurchaseButton` opens the modal regardless of login state. |
| `/about`, `/contact`, `/terms`, `/privacy` | Public | Static content. |
| `/login`, `/signup`, `/forgot-password` | Public | `AuthForm` / `ForgotPasswordForm`. |
| `/reset-password` | Public | Reached only via the emailed reset link (through `/auth/callback`); `ResetPasswordForm` does the actual password change. |
| `/account` | Soft-gated | Renders a "log in" prompt if `!user` rather than redirecting; shows `full_access` status and (if unlocked) a link to `/recordings`. |
| `/recordings` | **Hard-gated** | `if (!user) redirect("/signup")`. Content itself is 100% client-side (IndexedDB) — the gate exists because recording is part of the paid bundle, not because the page needs server data. |
| `/admin` | **Hard-gated, admin-only** | `requireAdmin()` → `redirect("/")` if not admin. Revenue stats (split by currency — see [data-model.md](./data-model.md#purchases)), user/session counts. |
| `/admin/letter-notes` | **Hard-gated, admin-only** | Same `requireAdmin()` gate; full CRUD UI for `letter_notes` (`LetterNotesAdmin`). |
| `/payments/return` | Public | Fallback landing page for a redirect-based payment flow; polls `/api/payments/status` and shows paid/pending/timeout. In practice QRPH doesn't redirect (see [payments.md](./payments.md)), so this mainly exists for future/other redirect-based methods. |

## API routes

| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/api/payments/checkout` | POST | Logged in, `!hasFullAccess` | Creates a PayMongo Payment Intent + `pending` purchases row. |
| `/api/payments/webhook` | POST | **HMAC signature only** (no user session — PayMongo calls this directly) | The only thing that marks a PayMongo purchase `paid`/`failed`. |
| `/api/payments/status` | GET | Logged in | Polled by the purchase modal / return page while waiting for confirmation. Read-only. |
| `/api/payments/paypal/create-order` | POST | Logged in, `!hasFullAccess` | Creates a PayPal Order + `pending` purchases row. Price always server-side. |
| `/api/payments/paypal/capture-order` | POST | Logged in | Captures the order directly against PayPal's API; marks `paid` only if PayPal's own response says `COMPLETED`, scoped to the caller's own row. |
| `/api/letter-notes/search` | GET | Public (titles); `hasFullAccess` gates the `notes` field | `notes` is nulled server-side, not client-side, for non-payers. |
| `/api/admin/letter-notes` | POST | **`requireAdmin()`** | Create a song. |
| `/api/admin/letter-notes/[id]` | PATCH, DELETE | **`requireAdmin()`** | Edit/delete a song. |
| `/api/session/register` | POST | Logged in | Issues this device's session token, overwriting any previous device's row in `active_sessions`. Called from `AuthForm` after login/signup, and from `/auth/callback` after a code-exchange login. |
| `/api/session/ping` | GET | Logged in (implicitly, via `proxy.ts`) | No logic of its own — just `{ ok: true }`. Its purpose is that `proxy.ts` runs on this path too, so a redirect response here (rather than `200`) is `SessionWatcher`'s signal that this device's session was invalidated. |
| `/auth/callback` | GET | Public (holds a Supabase PKCE `code`) | Exchanges `code` for a session (email confirmation *and* password recovery both land here), registers the session token, redirects to `?next=` or `/login?error=auth-callback-failed`. |
| `/robots.txt`, `/sitemap.xml`, `/icon`, `/ads.txt` | GET | Public | Next.js file-convention routes, not hand-written handlers (except `ads.txt`, which is a real `route.ts`). |

## Session / proxy

`src/proxy.ts` (Next.js 16's renamed `middleware.ts`) runs on almost every
request (matcher excludes only static assets):

1. Refreshes the Supabase auth cookie via `supabase.auth.getUser()`.
2. If a user is present, compares the request's session-token cookie
   against `active_sessions` for that user
   (`src/lib/sessions/sessionToken.ts`). A mismatch (another device
   logged in more recently) triggers `supabase.auth.signOut()` and a
   redirect to `/login?reason=signed-in-elsewhere`.
3. Two explicit exemptions from step 2, both documented in the file
   itself: `/api/session/register` (it's the route that *creates* the
   matching cookie, so there's legitimately no match yet at the moment it
   runs) and `/auth/callback` (a password-recovery link click may arrive
   with an unrelated, stale session cookie that has nothing to do with
   the recovery code being exchanged).

`SessionWatcher` (mounted in `layout.tsx` only when a user is logged in)
polls `/api/session/ping` every 20s (plus on tab-focus/visibility-change)
with `redirect: "manual"`, and treats an intercepted redirect
(`opaqueredirect`) as this device having been signed out elsewhere —
hard-redirecting client-side to the same `/login?reason=...` URL.
