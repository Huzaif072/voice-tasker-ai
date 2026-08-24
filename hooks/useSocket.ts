"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { SOCKET_EVENTS } from "@/lib/socket/server";

export function useSocket(userId?: string) {
  const qc = useQueryClient();
  const connectedRef = useRef(false);

  useEffect(() => {
    if (!userId || connectedRef.current) return;

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL;
    const socketEnabled = process.env.NEXT_PUBLIC_SOCKET_ENABLED === "true";
    const isLocalSocket = /^(https?:\/\/)?(localhost|127\.0\.0\.1)(:\d+)?$/.test(
      socketUrl?.replace(/\/$/, "") ?? ""
    );

    // The Next.js app does not start the separate Socket.IO service locally.
    // Require an explicit opt-in for local development so a stale .env value
    // cannot create repeated connection-refused requests on every dashboard visit.
    if (!socketUrl || (isLocalSocket && !socketEnabled)) return;

    let socket: import("socket.io-client").Socket | null = null;
    let cancelled = false;

    import("socket.io-client").then(({ io }) => {
      if (cancelled) return;

      socket = io(socketUrl, {
        auth: { userId },
        reconnection: false,
      });
      connectedRef.current = true;

      socket.on("connect_error", () => {
        connectedRef.current = false;
        socket?.close();
      });

      socket.on(SOCKET_EVENTS.TASK_CREATED, () =>
        qc.invalidateQueries({ queryKey: ["tasks"] })
      );
      socket.on(SOCKET_EVENTS.TASK_UPDATED, () =>
        qc.invalidateQueries({ queryKey: ["tasks"] })
      );
      socket.on(SOCKET_EVENTS.TASK_DELETED, () =>
        qc.invalidateQueries({ queryKey: ["tasks"] })
      );
      socket.on(SOCKET_EVENTS.NOTIFICATION, () =>
        qc.invalidateQueries({ queryKey: ["notifications"] })
      );
    });

    return () => {
      cancelled = true;
      socket?.disconnect();
      connectedRef.current = false;
    };
  }, [userId, qc]);
}
