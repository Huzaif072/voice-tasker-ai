"use client";

import { CheckSquare, Calendar, Mic, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/Card";

interface Stat {
  label: string;
  value: number | string;
  icon: React.ElementType;
  color: string;
  accent: string;
}

interface DashboardStatsProps {
  totalTasks?: number;
  completedToday?: number;
  dueThisWeek?: number;
  voiceCommands?: number;
}

export function DashboardStats({ totalTasks = 0, completedToday = 0, dueThisWeek = 0, voiceCommands = 0 }: DashboardStatsProps) {
  const stats: Stat[] = [
    { label: "Total tasks", value: totalTasks, icon: CheckSquare, color: "text-violet-300", accent: "bg-violet-500" },
    { label: "Completed today", value: completedToday, icon: TrendingUp, color: "text-emerald-300", accent: "bg-emerald-500" },
    { label: "Due this week", value: dueThisWeek, icon: Calendar, color: "text-sky-300", accent: "bg-sky-500" },
    { label: "Voice commands", value: voiceCommands, icon: Mic, color: "text-fuchsia-300", accent: "bg-fuchsia-500" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
      {stats.map(({ label, value, icon: Icon, color, accent }) => (
        <Card key={label} hover className="relative overflow-hidden p-4 sm:p-5">
          <div className={`absolute inset-x-0 top-0 h-0.5 ${accent}`} aria-hidden="true" />
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-slate-100 sm:text-3xl">{value}</p>
            </div>
            <div className={`shrink-0 rounded-xl bg-slate-700/60 p-2.5 ${color}`}>
              <Icon className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
