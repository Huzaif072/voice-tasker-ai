"use client";

import { useEffect, useState } from "react";
import { Activity, CheckCircle2, Mic2, ThumbsUp } from "lucide-react";
import { Card } from "@/components/ui/Card";

interface AnalyticsData { periodDays: number; metrics: Record<string, number>; activeDays: number; averageVoiceConfidence: number | null; feedback: Record<string, number>; }

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => { fetch("/api/analytics/overview").then((response) => response.ok ? response.json() : Promise.reject(new Error("analytics"))).then(setData).catch(() => setError(true)); }, []);
  if (error) return <p role="alert" className="text-sm text-red-400">Unable to load analytics.</p>;
  if (!data) return <p role="status" className="text-slate-400">Loading analytics...</p>;
  const positiveFeedback = Object.entries(data.feedback).filter(([key]) => key.endsWith("_positive")).reduce((sum, [, value]) => sum + value, 0);
  const totalFeedback = Object.values(data.feedback).reduce((sum, value) => sum + value, 0);
  const cards = [{ label: "Active days", value: data.activeDays, detail: `Last ${data.periodDays} days`, icon: Activity }, { label: "Tasks completed", value: data.metrics.task_completed ?? 0, detail: "Tracked completions", icon: CheckCircle2 }, { label: "Voice confidence", value: data.averageVoiceConfidence === null ? "—" : `${Math.round(data.averageVoiceConfidence * 100)}%`, detail: "Average parser confidence", icon: Mic2 }, { label: "Helpful feedback", value: totalFeedback ? `${Math.round((positiveFeedback / totalFeedback) * 100)}%` : "—", detail: `${totalFeedback} responses`, icon: ThumbsUp }];
  const eventRows = Object.entries(data.metrics).sort(([, a], [, b]) => b - a);
  const max = Math.max(1, ...eventRows.map(([, value]) => value));
  return <div className="space-y-6"><div><h2 className="text-2xl font-bold text-slate-100">Analytics</h2><p className="mt-1 text-sm text-slate-400">Your private VoiceTasker activity for the last {data.periodDays} days.</p></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{cards.map(({ label, value, detail, icon: Icon }) => <Card key={label}><div className="flex items-start justify-between"><div><p className="text-sm text-slate-400">{label}</p><p className="mt-2 text-2xl font-bold text-slate-100">{value}</p><p className="mt-1 text-xs text-slate-500">{detail}</p></div><Icon className="h-5 w-5 text-violet-300" /></div></Card>)}</div><Card><h3 className="font-semibold text-slate-100">Activity events</h3><div className="mt-4 space-y-3">{eventRows.length ? eventRows.map(([name, value]) => <div key={name} className="grid grid-cols-[minmax(0,1fr)_3fr_auto] items-center gap-3 text-sm"><span className="truncate text-slate-300">{name.replaceAll("_", " ")}</span><div className="h-2 rounded-full bg-slate-700"><div className="h-2 rounded-full bg-violet-500" style={{ width: `${Math.max(4, (value / max) * 100)}%` }} /></div><span className="text-slate-400">{value}</span></div>) : <p className="text-sm text-slate-500">No activity recorded yet.</p>}</div></Card></div>;
}
