"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { SummaryCard } from "@/components/ai/SummaryCard";
import { Button } from "@/components/ui/Button";
import { useAI } from "@/hooks/useAI";
import { speakText, stopSpeaking } from "@/lib/voice/speak";
import { FeedbackButtons } from "@/components/ai/FeedbackButtons";

export default function SummaryPage() {
  const { useSummary } = useAI();
  const [period, setPeriod] = useState<"daily" | "weekly">("daily");
  const summary = useSummary(period);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-100">Voice Briefing</h2>
        <div className="flex gap-2">
          <Button size="sm" variant={period === "daily" ? "primary" : "ghost"} onClick={() => setPeriod("daily")}>Daily</Button>
          <Button size="sm" variant={period === "weekly" ? "primary" : "ghost"} onClick={() => setPeriod("weekly")}>Weekly</Button>
          <Button size="sm" variant="ghost" onClick={() => summary.data?.summary ? speakText(summary.data.summary) : stopSpeaking()} disabled={!summary.data?.summary}>Read aloud</Button>
        </div>
      </div>
      <SummaryCard summary={summary.data?.summary ?? ""} period={period} loading={summary.isLoading} />
      {summary.data?.summary ? <div className="mt-3 flex justify-end"><FeedbackButtons category="summary" /></div> : null}
      {summary.isError ? <p role="alert" className="mt-4 text-sm text-red-400">Unable to load the briefing. Please try again.</p> : null}
    </motion.div>
  );
}
