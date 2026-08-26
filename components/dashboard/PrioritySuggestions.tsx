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
  deadlineSuggestion?: {
    dueDate?: string;
    reason?: string;
    source?: "ai" | "fallback" | "existing";
  };
}

interface AskAiError {
  taskId: string;
  message: string;
}

interface DeadlineResponse {
  dueDate?: unknown;
  reason?: unknown;
  source?: unknown;
  error?: unknown;
}

export function PrioritySuggestions() {
  const queryClient = useQueryClient();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [aiDeadlineId, setAiDeadlineId] = useState<string | null>(null);
  const [aiDeadlineError, setAiDeadlineError] = useState<AskAiError | null>(null);

  useEffect(() => {
    fetch("/api/tasks/priorities")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => setSuggestions(data?.suggestions ?? []))
      .catch(() => undefined);
  }, []);

  async function requestAiDeadline(suggestion: Suggestion) {
    if (!suggestion.taskId || aiDeadlineId) return;
    const taskId = suggestion.taskId;
    setAiDeadlineId(taskId);
    setAiDeadlineError(null);

    try {
      const response = await fetch("/api/ai/deadline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId }),
      });
      let result: DeadlineResponse = {};
      try {
        result = (await response.json()) as DeadlineResponse;
      } catch {
        // Convert an empty or invalid response into a useful inline error below.
      }

      if (!response.ok) {
        throw new Error(typeof result.error === "string" ? result.error : "The deadline assistant could not respond.");
      }
      const dueDate = result.dueDate;
      if (typeof dueDate !== "string" || !dueDate) {
        throw new Error("The deadline assistant did not return a usable date.");
      }

      const source = result.source === "fallback" ? "fallback" : "ai";
      const reason = typeof result.reason === "string" && result.reason.trim() ? result.reason : source === "ai" ? "Suggested by the task assistant" : "Suggested from the task priority";
      setSuggestions((current) => current.map((item) => item.taskId === taskId ? { ...item, deadlineSuggestion: { dueDate, reason, source } } : item));
    } catch (error) {
      setAiDeadlineError({ taskId, message: error instanceof Error ? error.message : "The deadline assistant could not respond." });
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
  return (
    <Card className="mt-6">
      <h3 className="font-semibold text-slate-100">Priority and deadline suggestions</h3>
      <p className="mt-1 text-xs text-slate-400">Based on deadlines, dependencies, completed-task patterns, and your saved completion behavior.</p>
      <ul className="mt-3 space-y-3">
        {suggestions.slice(0, 5).map((suggestion) => {
          const deadline = suggestion.deadlineSuggestion;
          const askAiError = aiDeadlineError?.taskId === suggestion.taskId ? aiDeadlineError?.message ?? null : null;
          return (
            <li key={suggestion.taskId} className="rounded-lg border border-slate-700/60 p-3 text-sm text-slate-300">
              <div>
                <span className="font-medium">{suggestion.title}</span>
                {suggestion.priority !== suggestion.currentPriority ? <span className="ml-2 text-violet-300">Priority: {suggestion.priority}</span> : null}
              </div>
              {suggestion.reasons.length ? <span className="mt-1 block text-xs text-slate-500">{suggestion.reasons.join(" · ")}</span> : null}
              {deadline?.dueDate ? (
                <>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="text-xs text-amber-200">Suggested deadline: {new Date(deadline.dueDate).toLocaleString()}</span>
                    <div className="flex shrink-0 items-center gap-2">
                      <button type="button" onClick={() => void requestAiDeadline(suggestion)} disabled={aiDeadlineId !== null || savingId !== null} className="rounded-md border border-slate-600 px-2 py-1 text-xs text-slate-300 hover:bg-slate-700 disabled:opacity-50">
                        {aiDeadlineId === suggestion.taskId ? "Thinking…" : "Ask AI"}
                      </button>
                      <button type="button" onClick={() => void applyDeadline(suggestion)} disabled={savingId !== null} className="rounded-md border border-violet-500/40 px-2 py-1 text-xs text-violet-200 hover:bg-violet-500/20 disabled:opacity-50">
                        {savingId === suggestion.taskId ? "Applying…" : "Apply"}
                      </button>
                    </div>
                  </div>
                  {deadline.source === "ai" ? <span className="mt-1 block text-xs text-violet-300">AI suggestion{deadline.reason ? `: ${deadline.reason}` : ""}</span> : deadline.source === "fallback" ? <span className="mt-1 block text-xs text-slate-500">AI was unavailable, so this priority-based estimate is shown.</span> : null}
                </>
              ) : null}
              {askAiError ? <span className="mt-2 block text-xs text-red-300" role="alert">Ask AI failed: {askAiError}</span> : null}
              <div className="mt-2 flex flex-wrap gap-3"><FeedbackButtons category="priority" /></div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
