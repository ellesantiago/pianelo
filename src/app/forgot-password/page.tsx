import type { Metadata } from "next";
import Link from "next/link";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Reset your password — Pianelo",
  description: "Request a link to reset your Pianelo account password.",
};

export default function ForgotPasswordPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-center text-2xl font-bold">Reset your password</h1>
      <p className="text-center text-sm text-neutral-500">
        Enter your email and we&apos;ll send you a link to reset your password.
      </p>
      <ForgotPasswordForm />
      <p className="text-center text-sm text-neutral-500">
        <Link href="/login" className="underline">
          Back to log in
        </Link>
      </p>
    </div>
  );
}
