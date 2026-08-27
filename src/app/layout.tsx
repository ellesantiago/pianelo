import type { Metadata } from "next";
import Link from "next/link";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { SessionWatcher } from "@/components/auth/SessionWatcher";
import { AdSlot } from "@/components/ads/AdSlot";

// Using the system font stack rather than next/font/google -- this keeps
// the build from depending on network access to Google Fonts at build time.

export const metadata: Metadata = {
  title: "Pianelo — Play Piano Online",
  description:
    "A clean, simple online piano you play with your computer keyboard, mouse, or touch.",
};

const ADSENSE_CLIENT_ID = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const user = await getCurrentUser();

  return (
    <html lang="en" className="h-full antialiased">
      {ADSENSE_CLIENT_ID && (
        <head>
          <script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`}
            crossOrigin="anonymous"
          />
        </head>
      )}
      <body className="flex min-h-full flex-col bg-white text-neutral-900">
        {user && <SessionWatcher />}
        <header className="border-b border-neutral-200">
          <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
            <Link href="/" className="text-base font-semibold tracking-tight">
              Pianelo
            </Link>
            <nav className="flex items-center gap-5 text-sm text-neutral-500">
              {user ? (
                <>
                  <Link href="/account" className="hover:text-neutral-900">
                    Account
                  </Link>
                  <SignOutButton />
                </>
              ) : (
                <>
                  <Link href="/login" className="hover:text-neutral-900">
                    Log in
                  </Link>
                  <Link
                    href="/signup"
                    className="rounded-md bg-neutral-900 px-3 py-1.5 text-white hover:bg-neutral-700"
                  >
                    Sign up
                  </Link>
                </>
              )}
            </nav>
          </div>
        </header>

        <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 py-10">{children}</main>

        <footer className="border-t border-neutral-200 py-3">
          <div className="mx-auto max-w-4xl px-4">
            <AdSlot slot="footer" hidden={user?.hasAdsRemoved} />
            <div className="mt-2 flex flex-col items-center gap-1 text-xs text-neutral-400">
              <div className="flex gap-4">
                <Link href="/pricing" className="hover:text-neutral-600">
                  Pricing
                </Link>
                <Link href="/terms" className="hover:text-neutral-600">
                  Terms
                </Link>
                <Link href="/privacy" className="hover:text-neutral-600">
                  Privacy
                </Link>
              </div>
              <p>© {new Date().getFullYear()} Pianelo</p>
            </div>
          </div>
        </footer>
        <Analytics />
      </body>
    </html>
  );
}
