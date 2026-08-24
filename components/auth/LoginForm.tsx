"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { OAuthButtons, AuthDivider, AuthFooterLink } from "./OAuthButtons";
import Link from "next/link";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const verificationStatus = searchParams.get("verified");
  const verificationMessage = verificationStatus === "1"
    ? "Your email has been verified successfully. You can now sign in."
    : verificationStatus === "0"
      ? "This verification link is invalid, expired, or has already been used."
      : "";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [verificationRequired, setVerificationRequired] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setVerificationRequired(false);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setVerificationRequired(Boolean(data.requiresEmailVerification));
        throw new Error(data.error ?? "Login failed");
      }
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-100">Welcome back!</h1>
      <p className="mt-2 text-slate-400">Log in to continue managing your tasks by voice.</p>
      {verificationMessage ? (
        <div
          className={`mt-5 rounded-xl border px-4 py-3 text-sm ${
            verificationStatus === "1"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : "border-amber-500/30 bg-amber-500/10 text-amber-300"
          }`}
          role="status"
        >
          {verificationMessage}
        </div>
      ) : null}

      <div className="mt-8">
        <OAuthButtons />
        <AuthDivider />

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="border-slate-600 bg-slate-800 text-slate-100 placeholder:text-slate-500"
            labelClassName="text-slate-300"
            required
          />
          <Input
            label="Password"
            type="password"
            showToggle
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border-slate-600 bg-slate-800 text-slate-100 placeholder:text-slate-500"
            labelClassName="text-slate-300"
            required
          />
          {error ? <p className="text-sm text-red-400" role="alert">{error}</p> : null}
          {verificationRequired ? (
            <Link
              href={`/verify-email?email=${encodeURIComponent(email.trim().toLowerCase())}`}
              className="block text-sm text-violet-400 hover:text-violet-300"
            >
              Resend verification email
            </Link>
          ) : null}
          <Button type="submit" loading={loading} className="w-full">
            Log in
          </Button>
        </form>

        <div className="mt-4 text-center">
          <Link href="/forgot-password" className="text-sm text-violet-400 hover:text-violet-300">
            Forgot your password?
          </Link>
        </div>

        <AuthFooterLink text="Don't have an account?" linkText="Sign up" href="/signup" />

        <p className="mt-8 text-center text-xs text-slate-400">
          By continuing, you agree to our{" "}
          <Link href="/terms" className="text-violet-400 hover:text-violet-300">Terms of Service</Link>{" "}
          and <Link href="/privacy" className="text-violet-400 hover:text-violet-300">Privacy Policy</Link>.
        </p>
      </div>
    </div>
  );
}
