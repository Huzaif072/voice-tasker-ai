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
    const onOnline = () => invalidate();
    window.addEventListener("online", onOnline);
    const fallbackPoll = window.setInterval(invalidate, 30_000);
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL;
    const socketEnabled = process.env.NEXT_PUBLIC_SOCKET_ENABLED === "true";
    const isLocalSocket = /^(https?:\/\/)?(localhost|127\.0\.0\.1)(:\d+)?$/.test(socketUrl?.replace(/\/$/, "") ?? "");
    if (!socketUrl || (isLocalSocket && !socketEnabled)) {
      return () => { window.clearInterval(fallbackPoll); window.removeEventListener("online", onOnline); channel?.close(); };
    }
    let socket: import("socket.io-client").Socket | null = null;
    let cancelled = false;
    import("socket.io-client").then(({ io }) => {
      if (cancelled) return;
      socket = io(socketUrl, { auth: { userId }, reconnection: false });
      connectedRef.current = true;
      socket.on("connect_error", () => { connectedRef.current = false; socket?.close(); });
      socket.on(SOCKET_EVENTS.TASK_CREATED, invalidate);
      socket.on(SOCKET_EVENTS.TASK_UPDATED, invalidate);
      socket.on(SOCKET_EVENTS.TASK_DELETED, invalidate);
      socket.on(SOCKET_EVENTS.NOTIFICATION, invalidate);
    });
    return () => { cancelled = true; socket?.disconnect(); connectedRef.current = false; window.clearInterval(fallbackPoll); window.removeEventListener("online", onOnline); channel?.close(); };
  }, [userId, qc]);
}
