"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { contextLocationStorageKey } from "@/hooks/useContextLocation";

type Provider = { provider: string; linkedAt: string };
type ReminderChannel = "in_app" | "email" | "push" | "voice";
type ReminderSettings = { enabled: boolean; channels: ReminderChannel[] };
type ProviderHealth = Record<string, string>;

export default function SecurityPage() {
  const { logout } = useAuth();
  const queryClient = useQueryClient();
  const { status: pushStatus, error: pushError, subscribe: subscribePush, unsubscribe: unsubscribePush } = usePushNotifications();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [hasPassword, setHasPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [unlinkingProvider, setUnlinkingProvider] = useState<string | null>(null);
  const [reminderSettings, setReminderSettings] = useState<ReminderSettings>({ enabled: true, channels: ["in_app"] });
  const [savingReminders, setSavingReminders] = useState(false);
  const [locationTriggersEnabled, setLocationTriggersEnabled] = useState(false);
  const [providerHealth, setProviderHealth] = useState<ProviderHealth | null>(null);
  const [consentStatus, setConsentStatus] = useState<{ accepted: boolean; current: { privacyPolicyVersion: string; termsVersion: string } } | null>(null);

  useEffect(() => {
    if (window.localStorage.getItem(contextLocationStorageKey) === "true") queueMicrotask(() => setLocationTriggersEnabled(true));
  }, []);

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

  useEffect(() => {
    fetch("/api/health/providers")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => { if (data?.providers) setProviderHealth(data.providers); })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    fetch("/api/account/consent")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => { if (data) setConsentStatus({ accepted: Boolean(data.accepted), current: data.current }); })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    fetch("/api/account/reminders")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => { if (data?.settings) setReminderSettings(data.settings); })
      .catch(() => setMessage("Unable to load reminder settings."));
  }, []);

  async function saveReminderSettings() {
    setSavingReminders(true);
    setMessage("");
    const settingsToSave = {
      ...reminderSettings,
      channels: reminderSettings.channels.filter((channel) => channel !== "push" || pushStatus === "subscribed"),
    };
    try {
      const response = await fetch("/api/account/reminders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settingsToSave),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to update reminder settings");
      setReminderSettings(data.settings);
      queryClient.setQueryData(["reminder-settings"], data.settings);
      setMessage("Reminder settings saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update reminder settings.");
    } finally {
      setSavingReminders(false);
    }
  }

  function toggleReminderChannel(channel: ReminderChannel) {
    if (channel === "push" && pushStatus !== "subscribed") {
      setMessage("Enable browser push before selecting push reminders.");
      return;
    }
    setReminderSettings((current) => {
      const channels = current.channels.includes(channel)
        ? current.channels.filter((item) => item !== channel)
        : [...current.channels, channel];
      return { ...current, channels: channels.includes("in_app") ? channels : ["in_app", ...channels] };
    });
  }

  async function renewConsent() {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/account/consent", { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to save consent");
      setConsentStatus({ accepted: true, current: { privacyPolicyVersion: data.privacyPolicyVersion, termsVersion: data.termsVersion } });
      setMessage("Your Terms and Privacy Policy consent was recorded.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save consent.");
    } finally {
      setLoading(false);
    }
  }

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
    setMessage("");
    try {
      const response = await fetch("/api/auth/revoke-sessions", { method: "POST" });
      if (!response.ok) throw new Error();
      await logout();
    } catch {
      setMessage("Unable to revoke sessions right now.");
      setLoading(false);
    }
  }

  function exportAccount() {
    setExporting(true);
    setMessage("");
    const link = document.createElement("a");
    link.href = "/api/account/export";
    link.download = "voicetasker-account-export.json";
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => setExporting(false), 1500);
  }

  async function deleteAccount() {
    if (!window.confirm("This permanently deletes your account, tasks, notifications, and voice history. Continue?")) return;
    setDeleting(true);
    setMessage("");
    try {
      const response = await fetch("/api/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: "DELETE" }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error ?? "Unable to delete account");
      await logout();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to delete account.");
      setDeleting(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-100">Account security</h1>
      <p className="mt-2 text-slate-400">Review how you sign in, manage sessions, and control your account data.</p>
      <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-950/40 p-6">
        <h2 className="text-lg font-semibold text-slate-100">Sign-in methods</h2>
        <div className="mt-4 space-y-3">
          {hasPassword ? <p className="text-sm text-slate-300">Email and password</p> : null}
          {providers.filter(({ provider }) => provider !== "credentials").map(({ provider, linkedAt }) => (
            <div key={`${provider}-${linkedAt}`} className="flex items-center justify-between text-sm text-slate-300">
              <span className="capitalize">{provider}</span>
              <div className="flex items-center gap-3">
                <span className="text-slate-500">Linked {new Date(linkedAt).toLocaleDateString()}</span>
                <button type="button" onClick={() => unlinkProvider(provider)} disabled={unlinkingProvider !== null || deleting} className="text-xs text-rose-300 hover:text-rose-200 disabled:opacity-50">
                  {unlinkingProvider === provider ? "Unlinking…" : "Unlink"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
      <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/40 p-6">
        <h2 className="text-lg font-semibold text-slate-100">Task reminders</h2>
        <p className="mt-2 text-sm text-slate-400">Choose whether due reminders create in-app, email, push, or browser voice notifications. In-app reminders remain the fallback channel.</p>
        <label className="mt-4 flex items-center gap-3 text-sm text-slate-300">
          <input type="checkbox" checked={reminderSettings.enabled} onChange={(event) => setReminderSettings((current) => ({ ...current, enabled: event.target.checked }))} className="h-4 w-4 accent-violet-500" />
          Enable task reminders
        </label>
        <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-300">
          {(["in_app", "email", "push", "voice"] as ReminderChannel[]).map((channel) => (
            <label key={channel} className="flex items-center gap-2">
              <input type="checkbox" checked={reminderSettings.channels.includes(channel) && (channel !== "push" || pushStatus === "subscribed")} disabled={channel === "in_app" || (channel === "push" && pushStatus !== "subscribed")} onChange={() => toggleReminderChannel(channel)} className="h-4 w-4 accent-violet-500" />
              <span className="capitalize">{channel.replace("_", " ")}</span>
              {channel === "push" && pushStatus !== "subscribed" ? <span className="text-xs text-slate-500">Enable browser push first</span> : null}
            </label>
          ))}
        </div>
        <Button className="mt-4" onClick={saveReminderSettings} loading={savingReminders}>Save reminder settings</Button>
      </section>
      <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/40 p-6">
        <h2 className="text-lg font-semibold text-slate-100">Browser push notifications</h2>
        <p className="mt-2 text-sm text-slate-400">Allow this browser to receive task reminders even when the dashboard is not open.</p>
        {pushStatus === "unconfigured" ? <p className="mt-3 text-sm text-slate-500">Push delivery requires VAPID settings on the server.</p> : null}
        {pushStatus === "denied" ? <p className="mt-3 text-sm text-amber-300">Browser notification permission is blocked. Enable it in the browser site settings.</p> : null}
        {pushError ? <p className="mt-3 text-sm text-rose-300" role="alert">{pushError}</p> : null}
        <Button className="mt-4" onClick={pushStatus === "subscribed" ? unsubscribePush : subscribePush} loading={pushStatus === "loading"} disabled={pushStatus === "unsupported" || pushStatus === "unconfigured" || pushStatus === "denied"}>
          {pushStatus === "subscribed" ? "Disable browser push" : "Enable browser push"}
        </Button>
      </section>
      <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/40 p-6">
        <h2 className="text-lg font-semibold text-slate-100">Context-aware reminders</h2>
        <p className="mt-2 text-sm text-slate-400">Location triggers use browser permission and send rounded coordinates only while you are signed in. Time, weather, and calendar checks run through the protected scheduler when configured.</p>
        <label className="mt-4 flex items-center gap-3 text-sm text-slate-300">
          <input type="checkbox" checked={locationTriggersEnabled} onChange={(event) => { const enabled = event.target.checked; setLocationTriggersEnabled(enabled); if (enabled) localStorage.setItem(contextLocationStorageKey, "true"); else localStorage.removeItem(contextLocationStorageKey); }} className="h-4 w-4 accent-violet-500" />
          Enable location-trigger evaluation
        </label>
      </section>
      {providerHealth ? <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/40 p-6"><h2 className="text-lg font-semibold text-slate-100">Provider status</h2><p className="mt-2 text-sm text-slate-400">Configuration status only; credentials and provider error details are never shown.</p><div className="mt-4 grid gap-2 sm:grid-cols-2">{Object.entries(providerHealth).map(([name, status]) => <div key={name} className="flex items-center justify-between rounded-lg border border-slate-800 px-3 py-2 text-sm"><span className="capitalize text-slate-300">{name.replace(/([A-Z])/g, " $1")}</span><span className={status === "ok" || status === "ready" || status === "configured" ? "text-emerald-300" : status === "disabled" || status === "unconfigured" ? "text-slate-500" : "text-amber-300"}>{status}</span></div>)}</div></section> : null}
      <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/40 p-6">
        <h2 className="text-lg font-semibold text-slate-100">Legal choices</h2>
        <p className="mt-2 text-sm text-slate-400">Review the current policy versions recorded for your account. Your consent history is included in account exports.</p>
        <p className="mt-3 text-sm text-slate-300">Status: {consentStatus?.accepted ? "Current" : "Needs review"}</p>
        {consentStatus ? <p className="mt-1 text-xs text-slate-500">Privacy {consentStatus.current.privacyPolicyVersion} · Terms {consentStatus.current.termsVersion}</p> : null}
        <Button className="mt-4" onClick={renewConsent} loading={loading}>Review and accept current policies</Button>
      </section>
      <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/40 p-6">
        <h2 className="text-lg font-semibold text-slate-100">Your data</h2>
        <p className="mt-2 text-sm text-slate-400">Download a JSON copy of your profile, tasks, notifications, and voice history.</p>
        <Button className="mt-4" onClick={exportAccount} loading={exporting}>Export account data</Button>
      </section>
      <section className="mt-6 rounded-2xl border border-rose-900/50 bg-rose-950/20 p-6">
        <h2 className="text-lg font-semibold text-slate-100">Log out all devices</h2>
        <p className="mt-2 text-sm text-slate-400">This invalidates every existing session, including this device.</p>
        <Button className="mt-4" onClick={revokeSessions} loading={loading} disabled={deleting}>Log out all devices</Button>
      </section>
      <section className="mt-6 rounded-2xl border border-rose-900/50 bg-rose-950/20 p-6">
        <h2 className="text-lg font-semibold text-rose-100">Delete account</h2>
        <p className="mt-2 text-sm text-rose-200/70">This permanently removes your account and all associated tasks, notifications, and voice history.</p>
        <button type="button" onClick={deleteAccount} disabled={deleting || loading} className="mt-4 rounded-lg border border-rose-700 px-4 py-2 text-sm font-medium text-rose-200 hover:bg-rose-900/40 disabled:cursor-not-allowed disabled:opacity-50">
          {deleting ? "Deleting account…" : "Delete account"}
        </button>
      </section>
      {message ? <p className="mt-3 text-sm text-rose-300" role="alert">{message}</p> : null}
    </div>
  );
}
