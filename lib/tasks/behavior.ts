import type { Task, TaskPriority } from "@/types/task";
import type { BehaviorProfile } from "@/types/user";

export function buildBehaviorProfile(tasks: Task[], previous?: BehaviorProfile): BehaviorProfile {
  const completed = tasks.filter((task) => task.status === "completed");
  const completionByPriority: Partial<Record<TaskPriority, number>> = {};
  const completionByTag: Record<string, number> = {};
  const highPriorityByTag: Record<string, number> = {};
  let completionHourTotal = 0;
  let completionHourCount = 0;

  for (const task of completed) {
    completionByPriority[task.priority] = (completionByPriority[task.priority] ?? 0) + 1;
    const isHighPriority = task.priority === "high" || task.priority === "urgent";
    for (const tag of task.tags ?? []) {
      const normalizedTag = tag.trim().toLowerCase();
      if (!normalizedTag) continue;
      completionByTag[normalizedTag] = (completionByTag[normalizedTag] ?? 0) + 1;
      if (isHighPriority) highPriorityByTag[normalizedTag] = (highPriorityByTag[normalizedTag] ?? 0) + 1;
    }
    const timestamp = Date.parse(task.updatedAt);
    if (Number.isFinite(timestamp)) {
      completionHourTotal += new Date(timestamp).getHours();
      completionHourCount += 1;
    }
  }

  return {
    completedTaskCount: completed.length,
    highPriorityCompletedCount: completed.filter((task) => task.priority === "high" || task.priority === "urgent").length,
    completionByPriority: { ...(previous?.completionByPriority ?? {}), ...completionByPriority },
    completionByTag: { ...(previous?.completionByTag ?? {}), ...completionByTag },
    highPriorityByTag: { ...(previous?.highPriorityByTag ?? {}), ...highPriorityByTag },
    preferredCompletionHour: completionHourCount ? Math.round(completionHourTotal / completionHourCount) : previous?.preferredCompletionHour,
    updatedAt: new Date().toISOString(),
  };
}
