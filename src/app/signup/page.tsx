import type { Metadata } from "next";
import Link from "next/link";
import { AuthForm } from "@/components/auth/AuthForm";

export const metadata: Metadata = {
  title: "Sign up — Pianelo",
  description: "Create a free Pianelo account to unlock letter notes, recording, and more.",
};

export default function SignupPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-center text-2xl font-bold">Create your account</h1>
      <AuthForm mode="signup" />
      <p className="text-center text-sm text-neutral-500">
        Already have an account?{" "}
        <Link href="/login" className="underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
