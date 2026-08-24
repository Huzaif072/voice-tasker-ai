"use client";

import { Card } from "@/components/ui/Card";
import { Mic } from "lucide-react";

interface SummaryCardProps {
  summary: string;
  period?: "daily" | "weekly";
  loading?: boolean;
}

export function SummaryCard({ summary, period = "daily", loading }: SummaryCardProps) {
  return (
    <Card glow>
      <div className="mb-3 flex items-center gap-2">
        <Mic className="h-4 w-4 text-violet-400" />
        <span className="text-sm font-medium capitalize text-violet-300">{period} Briefing</span>
      </div>
      {loading ? (
        <div className="animate-pulse space-y-2">
          <div className="h-4 rounded bg-slate-700" />
          <div className="h-4 w-3/4 rounded bg-slate-700" />
        </div>
      ) : (
        <p className="text-slate-300 leading-relaxed">{summary}</p>
      )}
    </Card>
  );
}
