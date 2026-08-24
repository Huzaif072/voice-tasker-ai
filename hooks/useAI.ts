"use client";

import { useMutation } from "@tanstack/react-query";

export function useAI() {
  const decompose = useMutation({
    mutationFn: async ({ title, description }: { title: string; description?: string }) => {
      const res = await fetch("/api/ai/decompose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description }),
      });
      if (!res.ok) throw new Error("Decomposition failed");
      return res.json();
    },
  });

  const summarize = useMutation({
    mutationFn: async (period: "daily" | "weekly" = "daily") => {
      const res = await fetch("/api/ai/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ period }),
      });
      if (!res.ok) throw new Error("Summary failed");
      return res.json();
    },
  });

  const followup = useMutation({
    mutationFn: async (taskId: string) => {
      const res = await fetch("/api/ai/followup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId }),
      });
      if (!res.ok) throw new Error("Follow-up failed");
      return res.json();
    },
  });

  return { decompose, summarize, followup };
}
