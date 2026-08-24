"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [message, setMessage] = useState(
    searchParams.get("error") ? "This verification link is invalid or expired." : "Check your inbox for a verification link."
  );
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => setCooldown((current) => Math.max(0, current - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  async function resend() {
    if (cooldown > 0 || !email.trim()) return;
    setLoading(true);
    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      const retryAfter = Number(response.headers.get("Retry-After") ?? "30");
      if (!response.ok) {
        setCooldown(Number.isFinite(retryAfter) ? Math.max(1, retryAfter) : 30);
        throw new Error(data.error ?? "Unable to request a new email right now.");
      }
      setCooldown(30);
      setMessage(data.message ?? "If an account needs verification, a new email has been sent.");
    } catch (requestError) {
      setMessage(requestError instanceof Error ? requestError.message : "Unable to request a new email right now. Please try again later.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout>
      <h1 className="text-3xl font-bold text-slate-100">Verify your email</h1>
      <p className="mt-2 text-slate-400" role="status" aria-live="polite">{message}</p>
      <div className="mt-8 space-y-4">
        <Input
          label="Email address"
          name="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          inputMode="email"
          autoCapitalize="none"
          spellCheck={false}
          className="border-slate-600 bg-slate-800 text-slate-100 placeholder:text-slate-500"
          labelClassName="text-slate-300"
        />
        <Button type="button" onClick={resend} loading={loading} className="w-full" disabled={!email.trim() || loading || cooldown > 0}>
          {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend verification email"}
        </Button>
        <p className="text-center text-sm text-slate-400">
          Already verified? <Link href="/login" className="text-violet-400 hover:text-violet-300">Sign in</Link>
        </p>
      </div>
    </AuthLayout>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<AuthLayout><p className="text-slate-400">Loading verification…</p></AuthLayout>}>
      <VerifyEmailContent />
    </Suspense>
  );
}
