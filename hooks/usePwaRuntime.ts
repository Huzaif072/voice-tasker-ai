"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

interface BeforeInstallPromptEvent extends Event { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }>; }
interface OfflineMutationState { pendingCount?: number; conflict?: boolean; failed?: boolean; }

function subscribeOnline(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => { window.removeEventListener("online", callback); window.removeEventListener("offline", callback); };
}
function getOnlineSnapshot() { return navigator.onLine; }
function getServerOnlineSnapshot() { return true; }

export function usePwaRuntime() {
  const online = useSyncExternalStore(subscribeOnline, getOnlineSnapshot, getServerOnlineSnapshot);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [pendingMutations, setPendingMutations] = useState(0);
  const [hasConflict, setHasConflict] = useState(false);
  const [hasFailedReplay, setHasFailedReplay] = useState(false);
  useEffect(() => {
    let registration: ServiceWorkerRegistration | undefined;
    navigator.serviceWorker?.register("/push-sw.js", { updateViaCache: "none" }).then((result) => {
      registration = result;
      void result.update().catch(() => undefined);
      result.active?.postMessage({ type: "offline-mutation-state" });
      if (navigator.onLine) result.active?.postMessage({ type: "flush-offline-mutations" });
    }).catch(() => undefined);
    const onOnline = () => registration?.active?.postMessage({ type: "flush-offline-mutations" });
    const onInstall = (event: Event) => { event.preventDefault(); setInstallPrompt(event as BeforeInstallPromptEvent); };
    const onMessage = (event: MessageEvent<OfflineMutationState>) => { if (event.data?.pendingCount !== undefined) setPendingMutations(event.data.pendingCount); if (event.data?.conflict) setHasConflict(true); if (event.data?.failed) setHasFailedReplay(true); };
    navigator.serviceWorker?.addEventListener("message", onMessage);
    window.addEventListener("online", onOnline); window.addEventListener("beforeinstallprompt", onInstall);
    return () => { window.removeEventListener("online", onOnline); window.removeEventListener("beforeinstallprompt", onInstall); navigator.serviceWorker?.removeEventListener("message", onMessage); };
  }, []);
  async function install() { if (!installPrompt) return false; await installPrompt.prompt(); const choice = await installPrompt.userChoice; setInstallPrompt(null); return choice.outcome === "accepted"; }
  return { online, canInstall: Boolean(installPrompt), install, pendingMutations, hasConflict, hasFailedReplay, dismissConflict: () => setHasConflict(false), dismissFailedReplay: () => setHasFailedReplay(false) };
}
