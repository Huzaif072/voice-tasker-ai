"use client";

import { useCallback, useEffect, useState } from "react";

type PushStatus = "loading" | "unsupported" | "unconfigured" | "subscribed" | "unsubscribed" | "denied" | "error";

function decodeVapidKey(value: string): ArrayBuffer {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const bytes = new Uint8Array(raw.length);
  for (let index = 0; index < raw.length; index += 1) bytes[index] = raw.charCodeAt(index);
  return bytes.buffer;
}

export function usePushNotifications() {
  const [status, setStatus] = useState<PushStatus>("loading");
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      setStatus("unsupported");
      return;
    }
    try {
      const response = await fetch("/api/account/push-subscription");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to load push notification status");
      if (!data.configured) {
        setStatus("unconfigured");
        return;
      }
      setStatus(data.subscribed ? "subscribed" : "unsubscribed");
    } catch (reason) {
      setStatus("error");
      setError(reason instanceof Error ? reason.message : "Unable to load push notification status");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) void refresh();
    });
    return () => { cancelled = true; };
  }, [refresh]);

  const subscribe = useCallback(async () => {
    setError(null);
    setStatus("loading");
    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        setStatus("unsupported");
        return;
      }
      const status = await Notification.requestPermission();
      if (status !== "granted") {
        setStatus("denied");
        return;
      }
      const configResponse = await fetch("/api/account/push-subscription");
      const config = await configResponse.json();
      if (!configResponse.ok || !config.configured || !config.publicKey) throw new Error(config.error ?? "Push notifications are not configured");
      const registration = await navigator.serviceWorker.register("/push-sw.js");
      const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: decodeVapidKey(config.publicKey) });
      const response = await fetch("/api/account/push-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to save push subscription");
      setStatus(data.subscribed ? "subscribed" : "error");
    } catch (reason) {
      setStatus("error");
      setError(reason instanceof Error ? reason.message : "Unable to enable push notifications");
    }
  }, []);

  const unsubscribe = useCallback(async () => {
    setError(null);
    setStatus("loading");
    try {
      const registration = await navigator.serviceWorker.getRegistration("/");
      const subscription = await registration?.pushManager.getSubscription();
      await subscription?.unsubscribe();
      const response = await fetch("/api/account/push-subscription", { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to remove push subscription");
      setStatus(data.subscribed ? "error" : "unsubscribed");
    } catch (reason) {
      setStatus("error");
      setError(reason instanceof Error ? reason.message : "Unable to disable push notifications");
    }
  }, []);

  return { status, error, subscribe, unsubscribe, refresh };
}
