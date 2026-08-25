"use client";

import { useState } from "react";

export function FeedbackButtons({ category, conversationId }: { category: "voice" | "priority" | "deadline" | "summary"; conversationId?: string | null }) {
  const [submitted, setSubmitted] = useState<"positive" | "negative" | null>(null);
  async function send(rating: "positive" | "negative") {
    if (submitted) return;
    try {
      const response = await fetch("/api/analytics/feedback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ category, rating, conversationId: conversationId ?? undefined }) });
      if (response.ok) setSubmitted(rating);
    } catch {
      // Feedback is optional and should never interrupt the primary task flow.
    }
  }
  return <span className="inline-flex items-center gap-2 text-xs text-slate-500" aria-label={`${category} feedback`}>{submitted ? <span role="status">Thanks for the feedback.</span> : <><span>Helpful?</span><button type="button" onClick={() => void send("positive")} className="rounded px-1.5 py-0.5 hover:bg-emerald-500/20 hover:text-emerald-300" aria-label="Helpful">Yes</button><button type="button" onClick={() => void send("negative")} className="rounded px-1.5 py-0.5 hover:bg-red-500/20 hover:text-red-300" aria-label="Not helpful">No</button></>}</span>;
}
