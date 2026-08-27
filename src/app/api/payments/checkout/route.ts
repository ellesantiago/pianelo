import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { createPaymentIntent } from "@/lib/payments/paymongo";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { PRODUCTS, isProductKey } from "@/lib/payments/products";

/**
 * Starts a checkout for one of the two one-time products (see
 * lib/payments/products.ts): creates a PayMongo Payment Intent and records a
 * "pending" purchases row. The browser then creates+attaches a Payment
 * Method directly against PayMongo (see PurchaseModal) -- this route never
 * itself unlocks anything; only the webhook does, once PayMongo confirms
 * the payment actually succeeded.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "You need to be logged in." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const product = body?.product;
  if (!isProductKey(product)) {
    return NextResponse.json({ error: "Unknown product." }, { status: 400 });
  }

  const alreadyOwned =
    (product === "content_unlock" && user.hasContentUnlock) ||
    (product === "remove_ads" && user.hasAdsRemoved);
  if (alreadyOwned) {
    return NextResponse.json({ error: "You already own this." }, { status: 400 });
  }

  const { priceCentavos, paymongoDescription } = PRODUCTS[product];

  try {
    const intent = await createPaymentIntent({
      amount: priceCentavos,
      description: paymongoDescription,
      metadata: { pianelo_user_id: user.id, product },
    });

    const service = createSupabaseServiceRoleClient();
    if (service) {
      await service.from("purchases").insert({
        user_id: user.id,
        product,
        provider: "paymongo",
        provider_payment_intent_id: intent.id,
        status: "pending",
        amount: priceCentavos / 100,
        currency: "PHP",
      });
    }

    return NextResponse.json({
      intentId: intent.id,
      clientKey: intent.attributes.client_key,
    });
  } catch (error) {
    console.error("PayMongo checkout failed:", error);
    return NextResponse.json(
      { error: "Could not start checkout. Please try again." },
      { status: 500 }
    );
  }
}
