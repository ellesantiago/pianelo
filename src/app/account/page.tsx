import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { AdSlot } from "@/components/ads/AdSlot";
import { PurchaseButton } from "@/components/paywall/PurchaseButton";

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
            <span className="text-neutral-500">Piano</span>
            <span>Free, unlimited use</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-neutral-500">Letter notes + recording</span>
            {user.hasContentUnlock ? (
              <span>Unlocked — thank you!</span>
            ) : (
              <PurchaseButton
                product="content_unlock"
                isLoggedIn
                className="rounded-md bg-neutral-900 px-2.5 py-1 text-xs font-semibold text-white hover:bg-neutral-700"
              />
            )}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-neutral-500">Ads</span>
            {user.hasAdsRemoved ? (
              <span>Removed — thank you!</span>
            ) : (
              <PurchaseButton
                product="remove_ads"
                isLoggedIn
                className="rounded-md bg-neutral-900 px-2.5 py-1 text-xs font-semibold text-white hover:bg-neutral-700"
              />
            )}
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-500">Devices</span>
            <span>1 (Pianelo allows one device at a time)</span>
          </div>
        </div>

        <Link
          href="/recordings"
          className="block rounded-xl border border-neutral-200 p-4 text-sm hover:bg-neutral-50"
        >
          <span className="font-medium">My Recordings →</span>
          <p className="mt-1 text-neutral-500">
            Saved on this device only -- recordings are never uploaded anywhere.
          </p>
        </Link>

        <SignOutButton />
      </div>

      <AdSlot slot="account-rail" hidden={user.hasAdsRemoved} className="w-full sm:w-40" />
    </div>
  );
}
