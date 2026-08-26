import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export default function ResetPasswordPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-center text-2xl font-bold">Choose a new password</h1>
      <ResetPasswordForm />
    </div>
  );
}
