"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";

type Provider = { provider: string; linkedAt: string };

export default function SecurityPage() {
  const { logout } = useAuth();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [hasPassword, setHasPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [unlinkingProvider, setUnlinkingProvider] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/providers")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data) {
          setProviders(data.providers ?? []);
          setHasPassword(Boolean(data.hasPassword));
        }
      })
      .catch(() => setMessage("Unable to load account security details."));
  }, []);

  async function unlinkProvider(provider: string) {
    if (!window.confirm(`Unlink ${provider}? All current sessions will be signed out.`)) return;
    setUnlinkingProvider(provider);
    setMessage("");
    try {
      const response = await fetch("/api/auth/providers", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to unlink provider");
      setProviders(data.providers ?? []);
      setMessage(`${provider} was unlinked. Please sign in again.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to unlink provider.");
    } finally {
      setUnlinkingProvider(null);
    }
  }

  async function revokeSessions() {
    setLoading(true);
    try {
      const response = await fetch("/api/auth/revoke-sessions", { method: "POST" });
      if (!response.ok) throw new Error();
      await logout();
    } catch {
      setMessage("Unable to revoke sessions right now.");
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-100">Account security</h1>
      <p className="mt-2 text-slate-400">Review how you sign in and invalidate sessions on other devices.</p>
      <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-950/40 p-6">
        <h2 className="text-lg font-semibold text-slate-100">Sign-in methods</h2>
        <div className="mt-4 space-y-3">
          {hasPassword ? <p className="text-sm text-slate-300">Email and password</p> : null}
          {providers.filter(({ provider }) => provider !== "credentials").map(({ provider, linkedAt }) => (
            <div key={`${provider}-${linkedAt}`} className="flex items-center justify-between text-sm text-slate-300">
              <span className="capitalize">{provider}</span>
              <div className="flex items-center gap-3">
                <span className="text-slate-500">Linked {new Date(linkedAt).toLocaleDateString()}</span>
                <button
                  type="button"
                  onClick={() => unlinkProvider(provider)}
                  disabled={unlinkingProvider !== null}
                  className="text-xs text-rose-300 hover:text-rose-200 disabled:opacity-50"
                >
                  {unlinkingProvider === provider ? "Unlinking…" : "Unlink"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
      <section className="mt-6 rounded-2xl border border-rose-900/50 bg-rose-950/20 p-6">
        <h2 className="text-lg font-semibold text-slate-100">Log out all devices</h2>
        <p className="mt-2 text-sm text-slate-400">This invalidates every existing session, including this device.</p>
        <Button className="mt-4" onClick={revokeSessions} loading={loading}>Log out all devices</Button>
        {message ? <p className="mt-3 text-sm text-rose-300" role="alert">{message}</p> : null}
      </section>
    </div>
  );
}
