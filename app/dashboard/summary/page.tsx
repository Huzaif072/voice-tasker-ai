"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { SummaryCard } from "@/components/ai/SummaryCard";
import { Button } from "@/components/ui/Button";
import { useAI } from "@/hooks/useAI";

export default function SummaryPage() {
  const { summarize } = useAI();
  const [period, setPeriod] = useState<"daily" | "weekly">("daily");

  useEffect(() => {
    summarize.mutate(period);
  }, [period, summarize]);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-100">Voice Briefing</h2>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={period === "daily" ? "primary" : "ghost"}
            onClick={() => setPeriod("daily")}
          >
            Daily
          </Button>
          <Button
            size="sm"
            variant={period === "weekly" ? "primary" : "ghost"}
            onClick={() => setPeriod("weekly")}
          >
            Weekly
          </Button>
        </div>
      </div>
      <SummaryCard
        summary={summarize.data?.summary ?? ""}
        period={period}
        loading={summarize.isPending}
      />
    </motion.div>
  );
}
