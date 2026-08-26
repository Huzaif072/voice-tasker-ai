import { Suspense } from "react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <AuthLayout>
      <Suspense fallback={<p role="status" aria-live="polite" className="text-slate-400">Loading sign-in…</p>}>
        <LoginForm />
      </Suspense>
    </AuthLayout>
  );
}
