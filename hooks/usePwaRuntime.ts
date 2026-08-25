"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function usePwaRuntime() {
  const [online, setOnline] = useState(() => typeof navigator === "undefined" ? true : navigator.onLine);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    let registration: ServiceWorkerRegistration | undefined;
    navigator.serviceWorker?.register("/push-sw.js").then((result) => {
      registration = result;
      if (navigator.onLine) result.active?.postMessage({ type: "flush-offline-mutations" });
    }).catch(() => undefined);
    const onOnline = () => {
      setOnline(true);
      registration?.active?.postMessage({ type: "flush-offline-mutations" });
    };
    const onOffline = () => setOnline(false);
    const onInstall = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    window.addEventListener("beforeinstallprompt", onInstall);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("beforeinstallprompt", onInstall);
    };
  }, []);

  async function install() {
    if (!installPrompt) return false;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    setInstallPrompt(null);
    return choice.outcome === "accepted";
  }

  return { online, canInstall: Boolean(installPrompt), install };
}
