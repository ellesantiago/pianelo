// Server-only PayPal client for full_access via the Orders v2 workflow:
// we create the order, PayPalButton gets the buyer's approval, and we
// capture directly against PayPal's API -- that capture call is itself
// the authoritative confirmation (no webhook needed).

function paypalApiBase(): string {
  return process.env.PAYPAL_ENV === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}

async function getAccessToken(): Promise<string> {
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("PayPal client ID/secret are not configured");
  }

  const res = await fetch(`${paypalApiBase()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    throw new Error(`PayPal token request failed (${res.status}): ${await res.text()}`);
  }

  const json = await res.json();
  return json.access_token as string;
}

export interface PayPalOrder {
  id: string;
  status: string;
}

export async function createOrder(options: {
  amountUsd: string; // decimal string, e.g. "5.00"
  description: string;
  metadata: { pianelo_user_id: string; product: string };
}): Promise<PayPalOrder> {
  const token = await getAccessToken();

  const res = await fetch(`${paypalApiBase()}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          custom_id: options.metadata.pianelo_user_id,
          description: options.description,
          amount: { currency_code: "USD", value: options.amountUsd },
        },
      ],
    }),
  });

  if (!res.ok) {
    throw new Error(`PayPal createOrder failed (${res.status}): ${await res.text()}`);
  }

  return (await res.json()) as PayPalOrder;
}

export interface PayPalCaptureResult {
  id: string;
  status: string;
}

export async function captureOrder(orderId: string): Promise<PayPalCaptureResult> {
  const token = await getAccessToken();

  const res = await fetch(`${paypalApiBase()}/v2/checkout/orders/${orderId}/capture`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(`PayPal captureOrder failed (${res.status}): ${JSON.stringify(json)}`);
  }

  return json as PayPalCaptureResult;
}
