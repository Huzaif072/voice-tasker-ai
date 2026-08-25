"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Notification } from "@/types/notification";
import type { ReminderSettings } from "@/types/user";

export function useNotifications() {
  return useQuery({
    queryKey: ["notifications"],
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
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

export function useReminderSettings() {
  return useQuery({
    queryKey: ["reminder-settings"],
    staleTime: 60_000,
    queryFn: async (): Promise<ReminderSettings> => {
      const response = await fetch("/api/account/reminders");
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error ?? "Unable to load reminder settings");
      return data.settings;
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

export function useAssignmentResponse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, action }: { taskId: string; action: "accept" | "decline" }) => {
      const response = await fetch(`/api/tasks/${encodeURIComponent(taskId)}/assignment`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error ?? "Unable to update assignment");
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
      void queryClient.invalidateQueries({ queryKey: ["tasks"] });
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
