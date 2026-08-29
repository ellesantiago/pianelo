import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { createOrder } from "@/lib/payments/paypal";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { PRODUCTS } from "@/lib/payments/products";

/**
 * Starts a PayPal checkout for full_access: creates a PayPal Order and
 * records a "pending" purchases row. The browser then has the buyer
 * approve it via PayPal's Buttons (see PayPalButton) and calls
 * capture-order -- this route never itself unlocks anything.
 */
export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "You need to be logged in." }, { status: 401 });
  }

  if (user.hasFullAccess) {
    return NextResponse.json({ error: "You already own this." }, { status: 400 });
  }

  const { priceUsdCents, checkoutDescription } = PRODUCTS.full_access;
  const amountUsd = (priceUsdCents / 100).toFixed(2);

  try {
    const order = await createOrder({
      amountUsd,
      description: checkoutDescription,
      metadata: { pianelo_user_id: user.id, product: "full_access" },
    });

    const service = createSupabaseServiceRoleClient();
    if (service) {
      await service.from("purchases").insert({
        user_id: user.id,
        product: "full_access",
        provider: "paypal",
        provider_payment_intent_id: order.id,
        status: "pending",
        amount: amountUsd,
        currency: "USD",
      });
    }

    return NextResponse.json({ orderId: order.id });
  } catch (error) {
    console.error("PayPal create-order failed:", error);
    return NextResponse.json(
      { error: "Could not start checkout. Please try again." },
      { status: 500 }
    );
  }
}
