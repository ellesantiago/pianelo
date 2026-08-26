import Link from "next/link";
import { AuthForm } from "@/components/auth/AuthForm";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error, reason } = await searchParams;

  return (
    <div className="space-y-6">
      <h1 className="text-center text-2xl font-bold">Log in</h1>
      {error === "auth-callback-failed" && (
        <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-center text-sm text-red-700">
          That confirmation link didn&apos;t work -- it may have expired. Try logging in, or sign up
          again to get a new link.
        </p>
      )}
      {reason === "signed-in-elsewhere" && (
        <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-center text-sm text-amber-800">
          You were signed out because your account was logged in on another device. Pianelo only
          allows one device at a time.
        </p>
      )}
      <AuthForm mode="login" />
      <p className="text-center text-sm text-neutral-500">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}
