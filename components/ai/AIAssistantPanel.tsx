"use client";

import { Card } from "@/components/ui/Card";
import { Sparkles } from "lucide-react";

export function AIAssistantPanel({ children }: { children?: React.ReactNode }) {
  return (
    <Card glow>
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-violet-400" />
        <span className="text-sm font-medium text-violet-300">AI Assistant</span>
      </div>
      {children ?? <p className="text-sm text-slate-400">Ask me anything about your tasks.</p>}
    </Card>
  );
}
