"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { OAuthButtons, AuthDivider, AuthFooterLink } from "./OAuthButtons";

export function SignupForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Signup failed");
      if (data.requiresEmailVerification) {
        router.push(`/verify-email?email=${encodeURIComponent(email.trim().toLowerCase())}`);
      } else {
        router.push("/dashboard");
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
        <OAuthButtons />
        <AuthDivider />

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            className="border-slate-600 bg-slate-800 text-slate-100 placeholder:text-slate-500"
            labelClassName="text-slate-300"
            required
          />
          <Input
            label="Email"
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
            type="password"
            showToggle
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            className="border-slate-600 bg-slate-800 text-slate-100 placeholder:text-slate-500"
            labelClassName="text-slate-300"
            required
          />
          <p className="-mt-2 text-xs leading-5 text-slate-400">
            Use at least 8 characters, including one uppercase letter and one number.
          </p>
          <Input
            label="Confirm password"
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
