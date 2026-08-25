"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";

type Suggestion = { taskId?: string; title: string; currentPriority: string; priority: string; reasons: string[] };

export function PrioritySuggestions() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  useEffect(() => {
    fetch("/api/tasks/priorities").then((response) => response.ok ? response.json() : null).then((data) => setSuggestions(data?.suggestions ?? [])).catch(() => undefined);
  }, []);
  if (!suggestions.length) return null;
  return <Card className="mt-6"><h3 className="font-semibold text-slate-100">Priority suggestions</h3><p className="mt-1 text-xs text-slate-400">Based on deadlines, dependencies, and patterns in your completed tasks.</p><ul className="mt-3 space-y-2">{suggestions.slice(0, 3).map((suggestion) => <li key={suggestion.taskId} className="text-sm text-slate-300"><span className="font-medium">{suggestion.title}</span><span className="ml-2 text-violet-300">{suggestion.priority}</span><span className="block text-xs text-slate-500">{suggestion.reasons.join(" · ")}</span></li>)}</ul></Card>;
}
