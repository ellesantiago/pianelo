# Pianelo

A clean, minimalist online piano. Anyone can look at it; playing it requires
an account and a one-time ₱99 payment (no subscription). One device may be
logged in at a time. Recordings are saved locally in the browser only.

## Stack

Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS v4, Supabase
(Postgres + Auth), PayMongo (one-time payments: card, GCash, Maya), Google
AdSense.

## Setup

```bash
npm install
cp .env.example .env.local
```

### 1. Supabase

Create a **new** Supabase project (do not reuse another project's database).

1. Project Settings → API: copy the Project URL and `anon` `public` key into
   `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
2. Project Settings → API: copy the `service_role` key into
   `SUPABASE_SERVICE_ROLE_KEY` (server-only, never expose this).
3. Run the migrations in `supabase/migrations/` in order, via the SQL editor
   or `supabase db push`.
4. Auth → Providers: email/password should already be enabled by default.
   Decide whether to require email confirmation (Auth → Settings) — either
   works with this app.

### 2. PayMongo

1. Create a PayMongo account, start in **test mode**.
2. Developers → API Keys: copy the Secret key into `PAYMONGO_SECRET_KEY` and
   the Public key into `NEXT_PUBLIC_PAYMONGO_PUBLIC_KEY`.
3. Developers → Webhooks: register an endpoint pointing at
   `https://<your-domain>/api/payments/webhook` (use a tunnel like `ngrok`
   for local testing), subscribed to at least `payment.paid` and
   `payment.failed`. Copy the webhook's signing secret into
   `PAYMONGO_WEBHOOK_SECRET`.
4. Test with PayMongo's documented test card numbers and test-mode
   GCash/Maya flows before ever switching to live keys.

**Before going live:** re-verify the webhook signature-verification code in
`src/app/api/payments/webhook/route.ts` against the exact snippet PayMongo's
dashboard shows for your endpoint — it was written from PayMongo's
documentation plus corroborating sources while their docs site was being
restructured, not from a single, fully-loaded reference page.

### 3. Google AdSense

Optional to start — ad slots render nothing until configured. Once you have
an AdSense account:

1. Copy your publisher ID (`ca-pub-...`) into `NEXT_PUBLIC_ADSENSE_CLIENT_ID`.
2. Create one ad unit per placement and copy each unit's slot ID into the
   matching `NEXT_PUBLIC_ADSENSE_SLOT_*` variable (see `.env.example`).

### Run it

```bash
npm run dev
```

## What's intentionally not built

No song library, no PayPal, no OAuth sign-in, no server-side recording
storage, no admin song/voucher management, no account-deletion grace-period
flow. See the plan this was built from for the full reasoning.
