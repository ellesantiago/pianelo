// Server-only PayMongo client for full_access (see lib/payments/products.ts)
// via the Payment Intent workflow: QRPH only -- the only method activated
// on this account without a registered business. This server creates the
// intent; the browser creates+attaches a Payment Method with the PUBLIC key
// (PurchaseModal.tsx), so card data never reaches this server. The webhook
// (api/payments/webhook/route.ts) is the only thing that marks it "paid".

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
  description: string;
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
          description: options.description,
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
