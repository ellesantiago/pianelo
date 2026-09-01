# Payments

One product, `full_access` (letter notes + local recording + no ads),
sold via two independent, unrelated payment providers. A user can pay
through either — both write to the same `purchases` table (see
[data-model.md](./data-model.md#purchases)) and both feed the same
`hasFullAccess` check in `getCurrentUser()`.

Both integrations follow the same non-negotiable rule (see
[SECURITY.md](../SECURITY.md)): **the amount charged always comes from a
server-side constant, and a purchase is only ever marked `paid` after an
authoritative, server-verified confirmation — never the browser's own
"it worked" callback.**

## Shared pricing: `src/lib/payments/products.ts`

```
PRODUCTS.full_access = {
  priceCentavos: <from NEXT_PUBLIC_FULL_ACCESS_PRICE_PESOS, default 149>,
  priceUsdCents: <from NEXT_PUBLIC_FULL_ACCESS_PRICE_USD, default 3>,
  ...
}
```

Both prices are env-driven so either can change without touching code —
see [configuration.md](./configuration.md). Every UI surface
(`PurchaseModal`, `pricing/page.tsx`, `PurchaseButton`) and every
server-side checkout route reads from this one object; nothing hardcodes
a price elsewhere (comments that used to mention specific numbers were
cleaned up to reference this file instead, so they can't drift out of
sync).

## PayMongo (QRPH)

QRPH is a Philippines-specific QR standard (scanned via GCash, Maya, or a
PH bank app) — it's the only method active on this PayMongo account
without a registered business.

1. **`POST /api/payments/checkout`** (`src/app/api/payments/checkout/route.ts`):
   server creates a PayMongo **Payment Intent**
   (`src/lib/payments/paymongo.ts`, using `PAYMONGO_SECRET_KEY`) for
   `priceCentavos`, inserts a `pending` purchases row, returns
   `{ intentId, clientKey }`.
2. **Client-side** (`PurchaseModal.tsx`): creates a PayMongo **Payment
   Method** (`type: "qrph"`) and **attaches** it to the intent, both
   directly from the browser using the *public* key
   (`NEXT_PUBLIC_PAYMONGO_PUBLIC_KEY`) — raw payment details never reach
   our server, only PayMongo's API. QRPH doesn't redirect: the attach
   response carries a base64 QR image (`next_action.code.image_url`)
   rendered inline for the customer to scan.
3. **Confirmation:** the modal polls `GET /api/payments/status` every 3s
   while the QR is showing. That route reports `hasFullAccess` off a
   `paid` row — normally webhook-written, but the route also reconciles
   any of the caller's own still-`pending` PayMongo rows directly against
   PayMongo's API first (`retrievePaymentIntent`), so a payment PayMongo
   already confirmed can't get stuck forever if the webhook call itself
   never lands (wrong secret, missing service-role key, etc.). Either way,
   polling never unlocks anything on the browser's say-so — only PayMongo's
   own reported status, webhook or direct, counts.
4. **`POST /api/payments/webhook`** (`src/app/api/payments/webhook/route.ts`):
   PayMongo calls this directly (no user session) once the QR is
   scanned/paid. Verifies the `Paymongo-Signature` header
   (`t=<ts>,te=<test_sig>,li=<live_sig>` — each an
   `HMAC-SHA256(\`${t}.${rawBody}\`, PAYMONGO_WEBHOOK_SECRET)` hex digest,
   compared with `crypto.timingSafeEqual`) before trusting anything in
   the payload. On `payment.paid`/`payment.failed`, updates the purchases
   row matching `provider_payment_intent_id` to `paid`/`failed`.
   **This is the primary path that sets a PayMongo row to `paid`** — the
   `/api/payments/status` reconciliation above (step 3) is the fallback for
   when this webhook call itself never arrives.

**Testing locally:** PayMongo's webhook needs a public URL to reach —
use a tunnel (e.g. `ngrok`) and register it in the PayMongo dashboard, per
the root README's setup steps.

## PayPal (Orders v2)

Meant for buyers QRPH can't reach (anyone outside the Philippines).
Deliberately built **without a webhook** — the capture call itself is a
direct, synchronous, server-to-server confirmation, so there's nothing
to wait on and nothing that needs a public URL for local testing.

1. **`POST /api/payments/paypal/create-order`**
   (`src/app/api/payments/paypal/create-order/route.ts`): server creates
   a PayPal **Order** (`src/lib/payments/paypal.ts`'s `createOrder()`,
   intent `CAPTURE`, using `PAYPAL_CLIENT_SECRET` for the OAuth2 token)
   for `priceUsdCents`, inserts a `pending` purchases row
   (`provider: "paypal"`, `currency: "USD"`), returns `{ orderId }`.
2. **Client-side** (`PayPalButton.tsx`): lazily loads PayPal's JS SDK
   (`NEXT_PUBLIC_PAYPAL_CLIENT_ID`) and renders PayPal's own Buttons
   widget. `createOrder` calls the route above; `onApprove` (after the
   buyer approves in PayPal's popup) calls the route below with the
   approved `orderID`.
3. **`POST /api/payments/paypal/capture-order`**
   (`src/app/api/payments/paypal/capture-order/route.ts`): calls PayPal's
   **capture** endpoint directly with our secret
   (`paypal.ts`'s `captureOrder()`), and only if PayPal's own synchronous
   response reports `status === "COMPLETED"` does it update the matching
   purchases row (`WHERE provider_payment_intent_id = orderId AND
   user_id = <caller>` — scoped so one user can never capture/flip
   another user's order) to `paid`. **This is the only thing that ever
   sets a PayPal row to `paid`.**

**`PAYPAL_ENV`** selects `api-m.sandbox.paypal.com` vs. `api-m.paypal.com`
— double-check this is what you intend before testing (sandbox = fake
money, live = real charges).

## Admin revenue reporting

`/admin` sums `purchases.amount` **split by `currency`** (`revenuePhp`,
`revenueUsd` — see `src/app/admin/page.tsx`), not as one blind total —
PayMongo rows are pesos, PayPal rows are dollars, and adding the two raw
numbers together would produce a meaningless figure. The `$` stat only
renders once at least one USD row exists, so it doesn't show a permanent
"$0.00" tile on a PayPal-less deployment.

## Adding a third provider

See the checklist in [SECURITY.md](../SECURITY.md#how-to-verify-this-model-hasnt-regressed) —
the short version: server-side price, authoritative server-verified
confirmation (webhook signature or direct capture call), and an update
scoped to the calling user's own row.
