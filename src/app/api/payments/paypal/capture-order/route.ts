import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { captureOrder } from "@/lib/payments/paypal";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

/**
 * Confirms a PayPal order after the buyer approves it in PayPal's Buttons
 * (see PayPalButton). Unlike PayMongo's QRPH flow, there's no webhook here:
 * this route calls PayPal's capture API directly with our secret and reads
 * PayPal's own synchronous response, which is itself the authoritative
 * confirmation -- so it's safe to mark the purchase paid right here.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "You need to be logged in." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const orderId = body?.orderId;
  if (typeof orderId !== "string" || !orderId) {
    return NextResponse.json({ error: "Missing order id." }, { status: 400 });
  }

  const service = createSupabaseServiceRoleClient();
  if (!service) {
    return NextResponse.json({ error: "Payments aren't configured." }, { status: 500 });
  }

  try {
    const capture = await captureOrder(orderId);

    if (capture.status !== "COMPLETED") {
      return NextResponse.json(
        { error: "Payment was not completed. Please try again." },
        { status: 400 }
      );
    }

    // Scoped to the caller's own row -- a buyer can't use this to flip
    // someone else's pending order to paid.
    const { data: updated } = await service
      .from("purchases")
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("provider_payment_intent_id", orderId)
      .eq("user_id", user.id)
      .select("id")
      .maybeSingle();

    if (!updated) {
      return NextResponse.json({ error: "Could not find that order." }, { status: 404 });
    }

    return NextResponse.json({ hasFullAccess: true });
  } catch (error) {
    console.error("PayPal capture-order failed:", error);
    return NextResponse.json(
      { error: "Could not confirm your payment. Please try again." },
      { status: 500 }
    );
  }
}
