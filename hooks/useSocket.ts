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
    if (!socketUrl) return;

    let socket: import("socket.io-client").Socket | null = null;

    import("socket.io-client").then(({ io }) => {
      socket = io(socketUrl, { auth: { userId } });
      connectedRef.current = true;

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
      socket?.disconnect();
      connectedRef.current = false;
    };
  }, [userId, qc]);
}
