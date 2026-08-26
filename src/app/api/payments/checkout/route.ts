import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { createPaymentIntent } from "@/lib/payments/paymongo";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

const PRICE_CENTAVOS = 9900; // PHP 99.00

/**
 * Starts a checkout: creates a PayMongo Payment Intent for ₱99 and records a
 * "pending" purchases row. The browser then creates+attaches a Payment
 * Method directly against PayMongo (see PaywallModal) -- this route never
 * itself unlocks anything; only the webhook does, once PayMongo confirms
 * the payment actually succeeded.
 */
export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "You need to be logged in." }, { status: 401 });
  }
  if (user.hasPurchased) {
    return NextResponse.json({ error: "You already have full access." }, { status: 400 });
  }

  try {
    const intent = await createPaymentIntent({
      amount: PRICE_CENTAVOS,
      metadata: { pianelo_user_id: user.id },
    });

    const service = createSupabaseServiceRoleClient();
    if (service) {
      await service.from("purchases").insert({
        user_id: user.id,
        provider: "paymongo",
        provider_payment_intent_id: intent.id,
        status: "pending",
        amount: PRICE_CENTAVOS / 100,
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
