import crypto from "crypto";
import { NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

/**
 * PayMongo webhook: the primary path for marking a purchase paid -- never
 * trust the browser's own "payment successful" redirect. Product-agnostic;
 * just flips whichever purchases row matches the intent id.
 * (/api/payments/status reconciles directly against PayMongo as a fallback
 * for when this call itself never arrives -- see that route's comment.)
 *
 * Signature (Paymongo-Signature header): "t=<unix_ts>,te=<test_sig>,
 * li=<live_sig>", each HMAC-SHA256(`${t}.${raw_body}`, webhook_secret)
 * hex-encoded; only one of te/li matches your endpoint's mode.
 *
 * Re-verify this against the exact snippet PayMongo's dashboard shows for
 * your endpoint before relying on it in production.
 */
export async function POST(request: Request) {
  const rawBody = await request.text();
  const signatureHeader = request.headers.get("paymongo-signature");
  const secret = process.env.PAYMONGO_WEBHOOK_SECRET;

  if (!secret || !signatureHeader || !isValidSignature(rawBody, signatureHeader, secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let payload: PayMongoWebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const eventType = payload?.data?.attributes?.type;
  const resource = payload?.data?.attributes?.data;
  const paymentIntentId =
    resource?.attributes?.payment_intent_id ??
    (resource?.type === "payment_intent" ? resource.id : undefined);

  if (eventType !== "payment.paid" && eventType !== "payment.failed") {
    // Always acknowledge event types we don't act on -- returning an error
    // for those just triggers PayMongo's retry logic for no reason (per
    // PayMongo's webhook best practices).
    return NextResponse.json({ received: true });
  }

  if (!paymentIntentId) {
    console.error("PayMongo webhook: no payment_intent_id in payload", payload);
    return NextResponse.json({ error: "Missing payment_intent_id" }, { status: 400 });
  }

  const service = createSupabaseServiceRoleClient();
  if (!service) {
    console.error("PayMongo webhook: Supabase service-role client unavailable (check env vars)");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const { error, data } = await service
    .from("purchases")
    .update({
      status: eventType === "payment.paid" ? "paid" : "failed",
      paid_at: eventType === "payment.paid" ? new Date().toISOString() : null,
    })
    .eq("provider_payment_intent_id", paymentIntentId)
    .select("id");

  if (error) {
    console.error("PayMongo webhook: failed to update purchases row", paymentIntentId, error);
    return NextResponse.json({ error: "Database update failed" }, { status: 500 });
  }

  if (!data?.length) {
    console.error("PayMongo webhook: no purchases row matched payment_intent_id", paymentIntentId);
    return NextResponse.json({ error: "No matching purchase" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

interface PayMongoWebhookPayload {
  data?: {
    attributes?: {
      type?: string;
      data?: {
        id?: string;
        type?: string;
        attributes?: { payment_intent_id?: string };
      };
    };
  };
}

function isValidSignature(rawBody: string, header: string, secret: string): boolean {
  const parts = Object.fromEntries(
    header.split(",").map((part) => {
      const [key, ...rest] = part.split("=");
      return [key, rest.join("=")];
    })
  );
  const { t, te, li } = parts;
  if (!t) return false;

  const expected = crypto.createHmac("sha256", secret).update(`${t}.${rawBody}`).digest("hex");
  const candidates = [te, li].filter((value): value is string => Boolean(value));

  return candidates.some((candidate) => {
    if (candidate.length !== expected.length) return false;
    return crypto.timingSafeEqual(Buffer.from(candidate), Buffer.from(expected));
  });
}
