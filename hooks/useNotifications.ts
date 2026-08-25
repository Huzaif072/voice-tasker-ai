"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Notification } from "@/types/notification";

export function useNotifications() {
  return useQuery({
    queryKey: ["notifications"],
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    queryFn: async (): Promise<Notification[]> => {
      const res = await fetch("/api/notifications");
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to load notifications");
      }
      const data = await res.json();
      return Array.isArray(data.notifications) ? data.notifications : [];
    },
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to mark notification as read");
      }
      return id;
    },
    onSuccess: (id) => {
      queryClient.setQueryData<Notification[]>(["notifications"], (current = []) =>
        current.map((notification) =>
          notification._id === id ? { ...notification, read: true } : notification
        )
      );
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to mark notifications as read");
      }
    },
    onSuccess: () => {
      queryClient.setQueryData<Notification[]>(["notifications"], (current = []) =>
        current.map((notification) => ({ ...notification, read: true }))
      );
    },
  });
}
