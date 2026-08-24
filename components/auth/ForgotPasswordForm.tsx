"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { AuthFooterLink } from "./OAuthButtons";
import { useToast } from "@/components/ui/Toast";
import { CheckCircle } from "lucide-react";

export function ForgotPasswordForm() {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSent(false);
    setLoading(true);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to send reset link");
      const message = data.message ?? "If an account exists, a reset link has been sent.";
      toast(message, "success");
      setSent(true);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to send reset link");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-100">Reset password</h1>
      <p className="mt-2 text-slate-400">Enter your email and we&apos;ll send you a reset link.</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border-slate-600 bg-slate-800 text-slate-100 placeholder:text-slate-500"
          labelClassName="text-slate-300"
          required
        />
        {error ? <p className="text-sm text-red-400" role="alert">{error}</p> : null}
        {sent ? (
          <div className="flex items-start gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-300" role="status">
            <CheckCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <div>
              <p className="text-sm font-medium">Reset email sent</p>
              <p className="mt-1 text-xs leading-5 text-emerald-200/80">
                Check your inbox and spam folder for the password-reset link. It expires in one hour.
              </p>
            </div>
          </div>
        ) : null}
        <Button type="submit" loading={loading} className="w-full">
          Send reset link
        </Button>
      </form>

      <AuthFooterLink text="Remember your password?" linkText="Go to login" href="/login" />
    </div>
  );
}
