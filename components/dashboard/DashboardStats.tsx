"use client";

import { CheckSquare, Calendar, Mic, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/Card";

interface Stat {
  label: string;
  value: number | string;
  icon: React.ElementType;
  color: string;
}

interface DashboardStatsProps {
  totalTasks?: number;
  completedToday?: number;
  dueThisWeek?: number;
  voiceCommands?: number;
}

export function DashboardStats({
  totalTasks = 0,
  completedToday = 0,
  dueThisWeek = 0,
  voiceCommands = 0,
}: DashboardStatsProps) {
  const stats: Stat[] = [
    { label: "Total Tasks", value: totalTasks, icon: CheckSquare, color: "text-violet-400" },
    { label: "Completed Today", value: completedToday, icon: TrendingUp, color: "text-emerald-400" },
    { label: "Due This Week", value: dueThisWeek, icon: Calendar, color: "text-sky-400" },
    { label: "Voice Commands", value: voiceCommands, icon: Mic, color: "text-violet-400" },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map(({ label, value, icon: Icon, color }) => (
        <Card key={label} hover>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">{label}</p>
              <p className="mt-1 text-3xl font-bold text-slate-100">{value}</p>
            </div>
            <div className={`rounded-xl bg-slate-700/50 p-3 ${color}`}>
              <Icon className="h-6 w-6" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
