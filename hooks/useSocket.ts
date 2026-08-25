"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { SOCKET_EVENTS } from "@/lib/socket/server";

export function useSocket(userId?: string) {
  const qc = useQueryClient();
  const connectedRef = useRef(false);
  useEffect(() => {
    if (!userId) return;
    const invalidate = () => {
      void qc.invalidateQueries({ queryKey: ["tasks"] });
      void qc.invalidateQueries({ queryKey: ["notifications"] });
    };
    const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("voicetasker-task-changes") : null;
    channel?.addEventListener("message", invalidate);
    const onOnline = () => { invalidate(); void pollServerEvents(); };
    window.addEventListener("online", onOnline);
    const lastEventAt = { current: new Date().toISOString() };
    async function pollServerEvents() {
      try {
        const response = await fetch(`/api/realtime/events?since=${encodeURIComponent(lastEventAt.current)}`, { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json() as { events?: Array<{ createdAt?: string }> };
        const events = Array.isArray(data.events) ? data.events : [];
        if (!events.length) return;
        const newest = events.at(-1)?.createdAt;
        if (newest) lastEventAt.current = newest;
        invalidate();
      } catch {
        // Optional event feed failures fall back to the existing socket and local-channel paths.
      }
    }
    void pollServerEvents();
    const fallbackPoll = window.setInterval(() => void pollServerEvents(), 10_000);
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL;
    const socketEnabled = process.env.NEXT_PUBLIC_SOCKET_ENABLED === "true";
    const isLocalSocket = /^(https?:\/\/)?(localhost|127\.0\.0\.1)(:\d+)?$/.test(socketUrl?.replace(/\/$/, "") ?? "");
    if (!socketUrl || (isLocalSocket && !socketEnabled)) {
      return () => { window.clearInterval(fallbackPoll); window.removeEventListener("online", onOnline); channel?.close(); };
    }
    let socket: import("socket.io-client").Socket | null = null;
    let cancelled = false;
    async function getRealtimeToken() {
      const response = await fetch("/api/realtime/token", { cache: "no-store" });
      if (!response.ok) throw new Error("Realtime token unavailable");
      const data = await response.json() as { token?: string };
      if (!data.token) throw new Error("Realtime token unavailable");
      return data.token;
    }
    void import("socket.io-client").then(async ({ io }) => {
      if (cancelled) return;
      try {
        const token = await getRealtimeToken();
        if (cancelled) return;
        socket = io(socketUrl, { auth: { token }, reconnection: true, reconnectionAttempts: Infinity, transports: ["websocket", "polling"] });
        socket.on("connect", () => { connectedRef.current = true; });
        socket.on("disconnect", () => { connectedRef.current = false; });
        socket.on("connect_error", async () => {
          connectedRef.current = false;
          if (cancelled || !socket) return;
          try { socket.auth = { token: await getRealtimeToken() }; socket.connect(); } catch { socket.close(); }
        });
        socket.on(SOCKET_EVENTS.TASK_CREATED, invalidate);
        socket.on(SOCKET_EVENTS.TASK_UPDATED, invalidate);
        socket.on(SOCKET_EVENTS.TASK_DELETED, invalidate);
        socket.on(SOCKET_EVENTS.NOTIFICATION, invalidate);
      } catch {
        // The authenticated event-feed fallback remains active when the socket service is unavailable.
      }
    });
    return () => { cancelled = true; socket?.disconnect(); connectedRef.current = false; window.clearInterval(fallbackPoll); window.removeEventListener("online", onOnline); channel?.close(); };
  }, [userId, qc]);
}
