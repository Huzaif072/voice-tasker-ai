import type { TaskPriority } from "@/types/task";

export const priorityConfig: Record<
  TaskPriority,
  { label: string; color: string; bg: string }
> = {
  low: { label: "Low", color: "text-sky-400", bg: "bg-sky-400/10" },
  medium: { label: "Medium", color: "text-amber-400", bg: "bg-amber-400/10" },
  high: { label: "High", color: "text-red-400", bg: "bg-red-400/10" },
  urgent: { label: "Urgent", color: "text-red-500", bg: "bg-red-500/20" },
};
