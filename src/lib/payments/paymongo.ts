// Server-only PayMongo client for the one-time ₱99 purchase (Payment Intent
// workflow: QRPH only -- the only method activated on this PayMongo account
// without a registered business). Verified against PayMongo's current docs
// (docs.paymongo.com) at build time:
//   - POST /v1/payment_intents (secret key) creates the intent; amount is in
//     centavos, currency "PHP", payment_method_allowed lists the types we
//     accept.
//   - The browser then creates a Payment Method with the PUBLIC key
//     (src/components/paywall/PaywallModal.tsx) and attaches it to this
//     intent -- card data never reaches this server, only PayMongo's API.
//   - The webhook (src/app/api/payments/webhook/route.ts) is the only thing
//     that ever marks a purchase "paid".

const PAYMONGO_API = "https://api.paymongo.com/v1";

function secretAuthHeader(): string {
  const key = process.env.PAYMONGO_SECRET_KEY;
  if (!key) throw new Error("PAYMONGO_SECRET_KEY is not configured");
  return `Basic ${Buffer.from(`${key}:`).toString("base64")}`;
}

export interface PayMongoPaymentIntent {
  id: string;
  attributes: {
    amount: number;
    currency: string;
    status: string;
    client_key: string;
  };
}

export async function createPaymentIntent(options: {
  amount: number; // centavos
  metadata?: Record<string, string>;
}): Promise<PayMongoPaymentIntent> {
  const res = await fetch(`${PAYMONGO_API}/payment_intents`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: secretAuthHeader(),
    },
    body: JSON.stringify({
      data: {
        attributes: {
          amount: options.amount,
          currency: "PHP",
          payment_method_allowed: ["qrph"],
          capture_type: "automatic",
          description: "Pianelo — full piano access (one-time)",
          metadata: options.metadata,
        },
      },
    }),
  });

  if (!res.ok) {
    throw new Error(`PayMongo createPaymentIntent failed (${res.status}): ${await res.text()}`);
  }

  const json = await res.json();
  return json.data as PayMongoPaymentIntent;
}

export async function retrievePaymentIntent(id: string): Promise<PayMongoPaymentIntent> {
  const res = await fetch(`${PAYMONGO_API}/payment_intents/${id}`, {
    headers: { Authorization: secretAuthHeader() },
  });
  if (!res.ok) {
    throw new Error(`PayMongo retrievePaymentIntent failed (${res.status}): ${await res.text()}`);
  }
  const json = await res.json();
  return json.data as PayMongoPaymentIntent;
}
