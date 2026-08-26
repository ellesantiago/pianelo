import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { AdSlot } from "@/components/ads/AdSlot";

export default async function AccountPage() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div className="space-y-6 text-center">
        <h1 className="text-2xl font-bold">Account</h1>
        <p className="text-neutral-500">Log in to see your account.</p>
        <Link
          href="/login"
          className="inline-block rounded-md bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-700"
        >
          Log in
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-8 sm:grid-cols-[1fr_auto]">
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Account</h1>

        <div className="space-y-3 rounded-xl border border-neutral-200 p-4 text-sm">
          <div className="flex justify-between">
            <span className="text-neutral-500">Email</span>
            <span>{user.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-500">Access</span>
            <span>{user.hasPurchased ? "Full access — thank you!" : "Not unlocked yet"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-500">Devices</span>
            <span>1 (Pianelo allows one device at a time)</span>
          </div>
        </div>

        {!user.hasPurchased && (
          <p className="text-sm text-neutral-500">
            Press any key on the piano to unlock full access for a one-time ₱99.
          </p>
        )}

        <SignOutButton />
      </div>

      <AdSlot slot="account-rail" hidden={user.hasPurchased} className="w-full sm:w-40" />
    </div>
  );
}
