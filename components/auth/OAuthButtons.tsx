"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSafeReturnTo } from "@/lib/auth/redirect";

const APPLE_SIGN_IN_ENABLED = process.env.NEXT_PUBLIC_APPLE_SIGN_IN_ENABLED === "true";

const oauthMessages: Record<string, string> = {
  apple_not_configured: "Apple sign-in is not configured yet. Add the Apple OAuth settings to enable it.",
  google_not_configured: "Google sign-in is not configured yet. Add the Google OAuth settings to enable it.",
  oauth_cancelled: "Sign-in was cancelled.",
  oauth_email_unverified: "Please use a Google or Apple account with a verified email address.",
  oauth_identity_conflict: "This provider account is already linked to a different user or does not match the existing link.",
  oauth_failed: "Sign-in failed. Please try again.",
  oauth_state_invalid: "Your sign-in session expired. Please try again.",
};

export function OAuthButtons({ returnTo }: { returnTo?: string } = {}) {
  const [loadingProvider, setLoadingProvider] = useState<"google" | "apple" | null>(null);
  const [queryState, setQueryState] = useState({ error: "", returnTo: "" });
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const searchParams = new URLSearchParams(window.location.search);
      setQueryState({ error: searchParams.get("error") ?? "", returnTo: searchParams.get("returnTo") ?? "" });
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  const oauthError = queryState.error ? oauthMessages[queryState.error] ?? "Sign-in failed. Please try again." : "";
  const safeReturnTo = getSafeReturnTo(returnTo ?? queryState.returnTo);

  function startOAuth(provider: "google" | "apple") {
    setLoadingProvider(provider);
    // OAuth endpoints issue a full redirect to an external provider.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign(`/api/auth/${provider}?returnTo=${encodeURIComponent(safeReturnTo)}`);
  }

  const busy = loadingProvider !== null;

  return (
    <div className="space-y-3">
      {oauthError ? (
        <p className="text-sm text-red-400" role="alert" aria-live="polite">
          {oauthError}
        </p>
      ) : null}
      <button
        type="button"
        onClick={() => startOAuth("google")}
        disabled={busy}
        aria-busy={loadingProvider === "google"}
        className="flex w-full items-center justify-center gap-3 rounded-lg border border-slate-600 bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500/20 disabled:cursor-wait disabled:opacity-60"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
        {loadingProvider === "google" ? "Connecting..." : "Continue with Google"}
      </button>
      {APPLE_SIGN_IN_ENABLED ? (
        <button
          type="button"
          onClick={() => startOAuth("apple")}
          disabled={busy}
        aria-busy={loadingProvider === "apple"}
        className="flex w-full items-center justify-center gap-3 rounded-lg border border-slate-600 bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500/20 disabled:cursor-wait disabled:opacity-60"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
        </svg>
          {loadingProvider === "apple" ? "Connecting..." : "Continue with Apple"}
        </button>
      ) : null}
    </div>
  );
}

export function AuthDivider() {
  return (
    <div className="relative my-6">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-slate-700" />
      </div>
      <div className="relative flex justify-center text-sm">
        <span className="bg-slate-900 px-4 text-slate-500">or</span>
      </div>
    </div>
  );
}

export function AuthFooterLink({
  text,
  linkText,
  href,
}: {
  text: string;
  linkText: string;
  href: string;
}) {
  return (
    <p className="mt-6 text-center text-sm text-slate-400">
      {text}{" "}
      <Link href={href} className="font-medium text-violet-400 hover:text-violet-300">
        {linkText}
      </Link>
    </p>
  );
}
