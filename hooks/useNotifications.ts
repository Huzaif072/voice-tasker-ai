"use client";

import { useQuery } from "@tanstack/react-query";
import type { Notification } from "@/types/notification";

export function useNotifications() {
  return useQuery({
    queryKey: ["notifications"],
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    queryFn: async (): Promise<Notification[]> => {
      const res = await fetch("/api/notifications");
      if (!res.ok) return [];
      const data = await res.json();
      return data.notifications ?? [];
    },
  });
}
