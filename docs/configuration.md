# Configuration (environment variables)

Copy `.env.example` to `.env.local` and fill in real values — see the root
[README.md](../README.md) for the step-by-step provider setup (Supabase
project, PayMongo account, PayPal app, AdSense). This file is just the
reference: what each variable does and whether it's safe to expose.

**Naming convention:** `NEXT_PUBLIC_*` = bundled into client-side
JavaScript, so treat it as public even though it lives in `.env.local` —
never put a real secret behind that prefix. Anything without the prefix
is server-only and must never be read from a Client Component.

`.env.local` is gitignored; `.env.example` is tracked and must never
contain a real value, only blank fields or non-sensitive defaults (the
two price vars are the only non-blank ones, deliberately).

## Supabase

| Variable | Exposure | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Your Supabase project's API URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | RLS-respecting key, used everywhere except service-role operations |
| `SUPABASE_SERVICE_ROLE_KEY` | **Secret** | Bypasses RLS entirely — server-only, see [data-model.md](./data-model.md) for exactly which writes need it |

## PayMongo

| Variable | Exposure | Purpose |
|---|---|---|
| `NEXT_PUBLIC_FULL_ACCESS_PRICE_PESOS` | Public | Peso price, whole pesos (e.g. `149`). Optional, defaults to 149. See [payments.md](./payments.md) |
| `PAYMONGO_SECRET_KEY` | **Secret** | Creates Payment Intents |
| `NEXT_PUBLIC_PAYMONGO_PUBLIC_KEY` | Public | Creates/attaches Payment Methods client-side (raw card data never touches our server) |
| `PAYMONGO_WEBHOOK_SECRET` | **Secret** | Verifies the webhook's HMAC signature — see [payments.md](./payments.md#paymongo-qrph) |

## PayPal

| Variable | Exposure | Purpose |
|---|---|---|
| `NEXT_PUBLIC_FULL_ACCESS_PRICE_USD` | Public | USD price, whole/decimal dollars (e.g. `3`). Optional, defaults to 3 |
| `PAYPAL_ENV` | Public | `sandbox` (default) or `live` — selects the API host. **`live` charges real money** |
| `NEXT_PUBLIC_PAYPAL_CLIENT_ID` | Public | Loads PayPal's JS SDK client-side |
| `PAYPAL_CLIENT_SECRET` | **Secret** | OAuth2 token + capture calls |

## Google AdSense

| Variable | Exposure | Purpose |
|---|---|---|
| `NEXT_PUBLIC_ADSENSE_CLIENT_ID` | Public | Publisher ID (`ca-pub-...`) |
| `NEXT_PUBLIC_ADSENSE_SLOT_BELOW_PIANO` | Public | Ad unit ID, homepage below the piano |
| `NEXT_PUBLIC_ADSENSE_SLOT_FOOTER` | Public | Ad unit ID, site footer (every page) |
| `NEXT_PUBLIC_ADSENSE_SLOT_RECORDINGS_RAIL` | Public | Ad unit ID, `/recordings` side rail |
| `NEXT_PUBLIC_ADSENSE_SLOT_ACCOUNT_RAIL` | Public | Ad unit ID, `/account` side rail |

All four ad slots render nothing (not even an empty placeholder) until
both `NEXT_PUBLIC_ADSENSE_CLIENT_ID` and that specific slot's ID are set
— see `AdSlot.tsx`. Ads are never shown to a user with `hasFullAccess`,
regardless of these variables.

## Non-secret config that isn't an env var

`src/config/legal.ts` holds `LEGAL_ENTITY_NAME`, `REGISTERED_ADDRESS`,
`SUPPORT_EMAIL`, and `LAST_UPDATED`, used by `/terms` and `/privacy`. It's
a plain TS file, not env-driven, since it's legal boilerplate text rather
than per-environment config — update it directly and redeploy.
