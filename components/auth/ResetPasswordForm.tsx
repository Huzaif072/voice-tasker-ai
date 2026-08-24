"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function ResetPasswordForm() {
  const router = useRouter();
  const [token] = useState(
    () => typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("token") ?? "" : ""
  );
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);


  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!token) {
      setError("This reset link is invalid or has expired.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to reset the password");
      setSuccess(true);
      window.setTimeout(() => router.push("/login"), 1400);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to reset the password");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div>
        <h1 className="text-3xl font-bold text-slate-100">Password updated</h1>
        <p className="mt-2 text-slate-400">Your password has been changed. Redirecting you to login...</p>
        <Link href="/login" className="mt-8 block">
          <Button className="w-full">Go to login</Button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-100">Choose a new password</h1>
      <p className="mt-2 text-slate-400">Create a new password for your VoiceTasker AI account.</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <Input
          label="New password"
          name="newPassword"
          type="password"
          showToggle
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          aria-describedby="reset-password-requirements"
          className="border-slate-600 bg-slate-800 text-slate-100 placeholder:text-slate-500"
          labelClassName="text-slate-300"
          required
        />
        <p id="reset-password-requirements" className="-mt-2 text-xs leading-5 text-slate-400">
          Use at least 8 characters, including one uppercase letter and one number.
        </p>
        <Input
          label="Confirm password"
          name="confirmPassword"
          type="password"
          showToggle
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
          className="border-slate-600 bg-slate-800 text-slate-100 placeholder:text-slate-500"
          labelClassName="text-slate-300"
          required
        />
        {error ? <p className="text-sm text-red-400" role="alert" aria-live="polite">{error}</p> : null}
        <Button type="submit" loading={loading} className="w-full">
          Update password
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-400">
        Remembered your password?{" "}
        <Link href="/login" className="font-medium text-violet-400 hover:text-violet-300">
          Go to login
        </Link>
      </p>
    </div>
  );
}
