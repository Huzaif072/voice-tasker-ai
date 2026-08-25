import type { Task, TaskPriority } from "@/types/task";
import type { BehaviorProfile } from "@/types/user";

const priorityWeight: Record<TaskPriority, number> = { low: 1, medium: 2, high: 3, urgent: 4 };

export function suggestPriority(task: Task, history: Task[], now = new Date(), profile?: BehaviorProfile): { priority: TaskPriority; reasons: string[] } {
  let score = priorityWeight[task.priority] ?? 2;
  const reasons: string[] = [];
  if (task.dueDate) {
    const due = Date.parse(task.dueDate);
    const hours = (due - now.getTime()) / 3_600_000;
    if (hours < 0) { score += 4; reasons.push("overdue"); }
    else if (hours <= 24) { score += 2; reasons.push("due within 24 hours"); }
    else if (hours <= 72) { score += 1; reasons.push("due within three days"); }
  }
  if (task.dependencies?.length) {
    const completed = new Set(history.filter((item) => item.status === "completed").map((item) => item._id));
    const blocked = task.dependencies.some((id) => !completed.has(id));
    if (blocked) { score -= 1; reasons.push("blocked by an incomplete dependency"); }
  }
  const completedPeers = history.filter((item) => item.status === "completed" && item.tags.some((tag) => task.tags.includes(tag)));
  if (completedPeers.length >= 3 && completedPeers.filter((item) => priorityWeight[item.priority] >= 3).length / completedPeers.length >= 0.6) {
    score += 1;
    reasons.push("similar tasks are frequently completed at high priority");
  }
  const tagSignals = (task.tags ?? []).map((tag) => tag.trim().toLowerCase()).filter(Boolean).map((tag) => ({ completed: profile?.completionByTag?.[tag] ?? 0, highPriority: profile?.highPriorityByTag?.[tag] ?? 0 }));
  if (tagSignals.some((signal) => signal.completed >= 2 && signal.highPriority / signal.completed >= 0.75)) {
    score += 1;
    reasons.push("your history favors high priority for this type of task");
  }
  if (profile?.preferredCompletionHour !== undefined && task.dueDate) {
    const dueHour = new Date(task.dueDate).getHours();
    if (Math.abs(dueHour - profile.preferredCompletionHour) <= 1) reasons.push("deadline matches your usual completion time");
  }
  if (profile && profile.completedTaskCount >= 5 && profile.highPriorityCompletedCount / profile.completedTaskCount >= 0.6 && priorityWeight[task.priority] < priorityWeight.high) {
    score += 1;
    reasons.push("your completed tasks are usually high priority");
  }
  const priority = score >= 6 ? "urgent" : score >= 4 ? "high" : score <= 1 ? "low" : "medium";
  return { priority, reasons };
}

export function suggestDeadline(task: Task, now = new Date()): { dueDate?: string; reason?: string } {
  if (task.dueDate || task.status === "completed" || task.status === "cancelled") return {};
  const offsetHours = task.priority === "urgent" ? 24 : task.priority === "high" ? 72 : task.priority === "medium" ? 7 * 24 : 14 * 24;
  return { dueDate: new Date(now.getTime() + offsetHours * 3_600_000).toISOString(), reason: `suggested from ${task.priority} priority` };
}
