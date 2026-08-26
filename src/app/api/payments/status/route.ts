import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";

/**
 * Polled by /payments/return while waiting for the webhook to land.
 * Deliberately just re-reads getCurrentUser() (which only ever reports
 * `hasPurchased: true` off a webhook-written "paid" row) rather than
 * checking PayMongo directly -- the webhook remains the single source of
 * truth for unlocking access.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ hasPurchased: user.hasPurchased });
}
