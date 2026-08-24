"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { OAuthButtons, AuthDivider, AuthFooterLink } from "./OAuthButtons";
import { getSafeReturnTo } from "@/lib/auth/redirect";

function getPasswordStrength(password: string) {
  return [password.length >= 8, /[A-Z]/.test(password), /[0-9]/.test(password), /[^A-Za-z0-9]/.test(password)].filter(Boolean).length;
}

export function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = getSafeReturnTo(searchParams.get("returnTo"));
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const passwordStrength = useMemo(() => getPasswordStrength(password), [password]);
  const passwordStrengthLabel = passwordStrength < 2 ? "Weak" : passwordStrength < 4 ? "Good" : "Strong";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      setError("Password must be at least 8 characters and include an uppercase letter and a number.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, returnTo }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Signup failed");
      if (data.requiresEmailVerification) {
        router.push(`/verify-email?email=${encodeURIComponent(email.trim().toLowerCase())}&returnTo=${encodeURIComponent(returnTo)}`);
      } else {
        router.push(returnTo);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-100">Sign up</h1>
      <p className="mt-2 text-slate-400">Start speaking your tasks into existence.</p>

      <div className="mt-8">
        <OAuthButtons returnTo={returnTo} />
        <AuthDivider />

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Name"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            className="border-slate-600 bg-slate-800 text-slate-100 placeholder:text-slate-500"
            labelClassName="text-slate-300"
            required
          />
          <Input
            label="Email"
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            className="border-slate-600 bg-slate-800 text-slate-100 placeholder:text-slate-500"
            labelClassName="text-slate-300"
            required
          />
          <Input
            label="Password"
            name="password"
            type="password"
            showToggle
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            aria-describedby="signup-password-requirements signup-password-strength"
            className="border-slate-600 bg-slate-800 text-slate-100 placeholder:text-slate-500"
            labelClassName="text-slate-300"
            required
          />
          <p id="signup-password-requirements" className="-mt-2 text-xs leading-5 text-slate-400">
            Use at least 8 characters, including one uppercase letter and one number.
          </p>
          <div id="signup-password-strength" className="-mt-1" aria-live="polite">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Password strength</span>
              <span>{password ? passwordStrengthLabel : "Not entered"}</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-700" aria-hidden="true">
              <div
                className={`h-full rounded-full transition-all ${passwordStrength < 2 ? "bg-red-400" : passwordStrength < 4 ? "bg-amber-400" : "bg-emerald-400"}`}
                style={{ width: `${password ? Math.max(25, passwordStrength * 25) : 0}%` }}
              />
            </div>
          </div>
          <Input
            label="Confirm password"
            name="confirmPassword"
            type="password"
            showToggle
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            error={confirmPassword && password !== confirmPassword ? "Passwords do not match." : undefined}
            className="border-slate-600 bg-slate-800 text-slate-100 placeholder:text-slate-500"
            labelClassName="text-slate-300"
            required
          />
          {error ? <p className="text-sm text-red-400" role="alert" aria-live="polite">{error}</p> : null}
          <p className="sr-only" aria-live="polite">{loading ? "Creating your account…" : ""}</p>
          <Button type="submit" loading={loading} className="w-full">
            Sign up with Email
          </Button>
        </form>

        <AuthFooterLink text="Already signed up?" linkText="Go to login" href="/login" />

        <p className="mt-8 text-center text-xs text-slate-400">
          By signing up, you agree to our{" "}
          <Link href="/terms" className="text-violet-400 hover:text-violet-300">Terms of Service</Link>{" "}
          and <Link href="/privacy" className="text-violet-400 hover:text-violet-300">Privacy Policy</Link>.
        </p>
      </div>
    </div>
  );
}
