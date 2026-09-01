import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { createSupabaseServerClient, createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { retrievePaymentIntent } from "@/lib/payments/paymongo";

/**
 * Polled by PurchaseModal/payments/return while waiting for the webhook to
 * land. Normally just re-reads getCurrentUser() (which only ever reports a
 * product unlocked off a "paid" purchases row) -- but first reconciles any
 * of the caller's own still-"pending" PayMongo rows directly against
 * PayMongo. This is the safety net for webhook delivery failures (wrong/
 * missing PAYMONGO_WEBHOOK_SECRET, missing SUPABASE_SERVICE_ROLE_KEY, etc.):
 * without it, a payment PayMongo already confirmed as paid can get stuck
 * "pending" forever if the webhook call never lands, since nothing else
 * ever asks PayMongo again. Querying PayMongo's API directly is just as
 * authoritative as the webhook (see SECURITY.md), so this never trusts the
 * browser -- only PayMongo's own reported status.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!user.hasFullAccess) {
    await reconcilePendingPaymongoPurchases(user.id);
  }

  const fresh = await getCurrentUser();
  return NextResponse.json({ hasFullAccess: fresh?.hasFullAccess ?? false });
}

async function reconcilePendingPaymongoPurchases(userId: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return;

  const { data: pending } = await supabase
    .from("purchases")
    .select("provider_payment_intent_id")
    .eq("user_id", userId)
    .eq("provider", "paymongo")
    .eq("status", "pending");

  if (!pending?.length) return;

  const service = createSupabaseServiceRoleClient();
  if (!service) return;

  for (const row of pending) {
    const intentId = row.provider_payment_intent_id;
    if (!intentId) continue;

    try {
      const intent = await retrievePaymentIntent(intentId);
      if (intent.attributes.status !== "succeeded") continue;

      const { error } = await service
        .from("purchases")
        .update({ status: "paid", paid_at: new Date().toISOString() })
        .eq("provider_payment_intent_id", intentId)
        .eq("user_id", userId);

      if (error) {
        console.error("Payment reconciliation: failed to mark purchase paid", intentId, error);
      }
    } catch (err) {
      console.error("Payment reconciliation: PayMongo lookup failed", intentId, err);
    }
  }
}
