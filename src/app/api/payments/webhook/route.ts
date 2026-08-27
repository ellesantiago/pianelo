import crypto from "crypto";
import { NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

/**
 * PayMongo webhook: the sole source of truth for marking a purchase paid.
 * Never trust the browser's "payment successful" redirect on its own.
 * Product-agnostic -- it just flips whichever purchases row matches the
 * payment intent id, regardless of which product (content_unlock /
 * remove_ads) that row is for.
 *
 * Signature format (Paymongo-Signature header): "t=<unix_ts>,te=<test_sig>,
 * li=<live_sig>", where each signature is HMAC-SHA256(`${t}.${raw_body}`,
 * webhook_secret) hex-encoded. Only one of te/li will actually match your
 * configured secret (whichever mode your endpoint was registered in).
 *
 * NOTE: PayMongo's docs site was mid-restructuring when this was written and
 * the canonical page for this exact format was unreachable -- this was
 * corroborated from PayMongo's own best-practices doc plus community
 * integration reports, not read verbatim from the primary reference. Before
 * relying on this in production, compare it against the verification
 * snippet PayMongo's dashboard shows when you register the webhook.
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

  const service = createSupabaseServiceRoleClient();

  if (service && paymentIntentId && (eventType === "payment.paid" || eventType === "payment.failed")) {
    await service
      .from("purchases")
      .update({
        status: eventType === "payment.paid" ? "paid" : "failed",
        paid_at: eventType === "payment.paid" ? new Date().toISOString() : null,
      })
      .eq("provider_payment_intent_id", paymentIntentId);
  }

  // Always acknowledge, even for event types we don't act on -- returning an
  // error for an unrecognized type just triggers PayMongo's retry logic for
  // no reason (per PayMongo's webhook best practices).
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
