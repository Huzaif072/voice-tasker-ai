"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { FeedbackButtons } from "@/components/ai/FeedbackButtons";

interface Suggestion {
  taskId?: string;
  title: string;
  currentPriority: string;
  priority: string;
  reasons: string[];
  deadlineSuggestion?: { dueDate?: string; reason?: string };
}

export function PrioritySuggestions() {
  const queryClient = useQueryClient();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [aiDeadlineId, setAiDeadlineId] = useState<string | null>(null);
  useEffect(() => {
    fetch("/api/tasks/priorities").then((response) => response.ok ? response.json() : null).then((data) => setSuggestions(data?.suggestions ?? [])).catch(() => undefined);
  }, []);

  async function requestAiDeadline(suggestion: Suggestion) {
    if (!suggestion.taskId || aiDeadlineId) return;
    setAiDeadlineId(suggestion.taskId);
    try {
      const response = await fetch("/api/ai/deadline", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ taskId: suggestion.taskId }) });
      const result = await response.json();
      if (response.ok && result.dueDate) setSuggestions((current) => current.map((item) => item.taskId === suggestion.taskId ? { ...item, deadlineSuggestion: { dueDate: result.dueDate, reason: result.reason } } : item));
    } finally {
      setAiDeadlineId(null);
    }
  }

  async function applyDeadline(suggestion: Suggestion) {
    if (!suggestion.taskId || !suggestion.deadlineSuggestion?.dueDate || savingId) return;
    setSavingId(suggestion.taskId);
    try {
      const response = await fetch(`/api/tasks/${encodeURIComponent(suggestion.taskId)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dueDate: suggestion.deadlineSuggestion.dueDate }) });
      if (!response.ok) throw new Error("Unable to apply deadline");
      setSuggestions((current) => current.filter((item) => item.taskId !== suggestion.taskId));
      await queryClient.invalidateQueries({ queryKey: ["tasks"] });
    } catch {
      // Leave the suggestion visible when a server update fails.
    } finally {
      setSavingId(null);
    }
  }

  if (!suggestions.length) return null;
  return <Card className="mt-6"><h3 className="font-semibold text-slate-100">Priority and deadline suggestions</h3><p className="mt-1 text-xs text-slate-400">Based on deadlines, dependencies, completed-task patterns, and your saved completion behavior.</p><ul className="mt-3 space-y-3">{suggestions.slice(0, 5).map((suggestion) => <li key={suggestion.taskId} className="rounded-lg border border-slate-700/60 p-3 text-sm text-slate-300"><div><span className="font-medium">{suggestion.title}</span>{suggestion.priority !== suggestion.currentPriority ? <span className="ml-2 text-violet-300">Priority: {suggestion.priority}</span> : null}</div>{suggestion.reasons.length ? <span className="mt-1 block text-xs text-slate-500">{suggestion.reasons.join(" · ")}</span> : null}{suggestion.deadlineSuggestion?.dueDate ? <div className="mt-2 flex items-center justify-between gap-2"><span className="text-xs text-amber-200">Suggested deadline: {new Date(suggestion.deadlineSuggestion.dueDate).toLocaleString()}</span><button type="button" onClick={() => void requestAiDeadline(suggestion)} disabled={aiDeadlineId !== null || savingId !== null} className="rounded-md border border-slate-600 px-2 py-1 text-xs text-slate-300 hover:bg-slate-700 disabled:opacity-50">{aiDeadlineId === suggestion.taskId ? "Thinking…" : "Ask AI"}</button><button type="button" onClick={() => void applyDeadline(suggestion)} disabled={savingId !== null} className="rounded-md border border-violet-500/40 px-2 py-1 text-xs text-violet-200 hover:bg-violet-500/20 disabled:opacity-50">{savingId === suggestion.taskId ? "Applying…" : "Apply"}</button>
</div> : null}<div className="mt-2 flex flex-wrap gap-3"><FeedbackButtons category="priority" />{suggestion.deadlineSuggestion?.dueDate ? <FeedbackButtons category="deadline" /> : null}</div></li>)}</ul></Card>;
}
