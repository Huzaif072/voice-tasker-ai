"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";

type Invitation = { status: "pending" | "accepted" | "declined" | "revoked" | "expired"; expiresAt: string; recipientEmail: string | null; phoneVerificationRequired?: boolean; phoneVerified?: boolean };

export default function InvitationPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const { user, loading: authLoading } = useAuth();
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState(false);
  const [message, setMessage] = useState("");
  const [verificationCode, setVerificationCode] = useState("");

  useEffect(() => {
    if (!token) return;
    fetch(`/api/invitations/${encodeURIComponent(token)}`, { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Invitation unavailable");
        setInvitation(data);
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : "Invitation unavailable"))
      .finally(() => setLoading(false));
  }, [token]);

  async function respond(action: "accept" | "decline") {
    setResponding(true);
    setMessage("");
    try {
      const response = await fetch(`/api/invitations/${encodeURIComponent(token)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, ...(verificationCode ? { verificationCode } : {}) }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to update invitation");
      setInvitation((current) => current ? { ...current, status: data.status } : current);
      setMessage(action === "accept" ? "Assignment accepted. Open your assigned tasks from the dashboard." : "Assignment declined.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update invitation");
    } finally {
      setResponding(false);
    }
  }

  const loginTarget = `/invite/${encodeURIComponent(token)}`;
  const active = invitation?.status === "pending";

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12">
      <section className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-violet-300">VoiceTasker AI</p>
        <h1 className="mt-4 text-2xl font-bold text-slate-100">Task assignment invitation</h1>
        {loading || authLoading ? <p className="mt-4 text-slate-400">Loading invitation…</p> : null}
        {!loading && !invitation && message ? <p className="mt-4 text-rose-300" role="alert">{message}</p> : null}
        {invitation ? <>
          <p className="mt-4 text-slate-300">You have been invited to collaborate on a VoiceTasker task.</p>
          <p className="mt-2 text-sm text-slate-500">This invitation expires on {new Date(invitation.expiresAt).toLocaleString()}.</p>
          {active && !user ? <div className="mt-6 flex flex-wrap gap-3"><Link href={`/login?returnTo=${encodeURIComponent(loginTarget)}`}><Button>Sign in to respond</Button></Link><Link href={`/signup?returnTo=${encodeURIComponent(loginTarget)}`}><Button variant="secondary">Create account</Button></Link></div> : null}
          {active && user ? <div className="mt-6 space-y-4">{invitation.phoneVerificationRequired && !invitation.phoneVerified ? <div><label htmlFor="invitation-verification-code" className="block text-sm font-medium text-slate-300">Phone verification code</label><p id="invitation-code-help" className="mt-1 text-xs text-slate-500">Enter the six-digit code sent to the invited phone.</p><input id="invitation-verification-code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={verificationCode} onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, "").slice(0, 6))} aria-describedby="invitation-code-help" className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500" /></div> : null}<div className="flex flex-wrap gap-3"><Button onClick={() => void respond("accept")} loading={responding} disabled={Boolean(invitation.phoneVerificationRequired && !invitation.phoneVerified && verificationCode.length !== 6)}>Accept assignment</Button><Button variant="secondary" onClick={() => void respond("decline")} loading={responding} disabled={Boolean(invitation.phoneVerificationRequired && !invitation.phoneVerified && verificationCode.length !== 6)}>Decline</Button></div></div> : null}
          {!active ? <p className="mt-6 text-slate-300">This invitation is {invitation.status}.</p> : null}
          {message ? <p className="mt-4 text-sm text-slate-300" role="status">{message}</p> : null}
        </> : null}
      </section>
    </main>
  );
}
