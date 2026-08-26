import { Suspense } from "react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { SignupForm } from "@/components/auth/SignupForm";

export default function SignupPage() {
  return (
    <AuthLayout>
      <Suspense fallback={<p role="status" aria-live="polite" className="text-slate-400">Loading sign-up…</p>}>
        <SignupForm />
      </Suspense>
    </AuthLayout>
  );
}
