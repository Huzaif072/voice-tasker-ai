"use client";

import { useQuery } from "@tanstack/react-query";
import type { VoiceSession } from "@/types/voice";

export function useVoiceHistory() {
  return useQuery({
    queryKey: ["voice-history"],
    queryFn: async (): Promise<VoiceSession[]> => {
      const response = await fetch("/api/voice/history");
      if (!response.ok) throw new Error("Unable to load voice history");
      const data = await response.json();
      return data.sessions ?? [];
    },
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
}
