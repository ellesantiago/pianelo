import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

/**
 * DEV ONLY: simulates PayMongo's webhook confirming payment. PayMongo can't
 * reach localhost to deliver the real webhook (see api/payments/webhook),
 * so this lets you exercise the QRPH checkout UI end-to-end against
 * PAYMONGO_SECRET_KEY/NEXT_PUBLIC_PAYMONGO_PUBLIC_KEY test keys without a
 * public tunnel: start checkout as normal (a real Payment Intent is created
 * against PayMongo's sandbox), then hit this route to mark it "paid" the
 * same way the webhook would.
 *
 * Marks the current user's latest pending purchase as paid, so this cannot
 * be used to grant access to another user's purchase, and is disabled
 * entirely outside development.
 */
export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "You need to be logged in." }, { status: 401 });
  }

  const service = createSupabaseServiceRoleClient();
  if (!service) {
    return NextResponse.json({ error: "Supabase isn't configured." }, { status: 500 });
  }

  const { data: pending } = await service
    .from("purchases")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!pending) {
    return NextResponse.json(
      { error: "No pending purchase found. Start checkout (the Unlock button) first." },
      { status: 404 }
    );
  }

  await service
    .from("purchases")
    .update({ status: "paid", paid_at: new Date().toISOString() })
    .eq("id", pending.id);

  return NextResponse.json({ confirmed: true, purchaseId: pending.id });
}
