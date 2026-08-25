import type { Task, TaskPriority } from "@/types/task";

const priorityWeight: Record<TaskPriority, number> = { low: 1, medium: 2, high: 3, urgent: 4 };

export function suggestPriority(task: Task, history: Task[], now = new Date()): { priority: TaskPriority; reasons: string[] } {
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
  const priority = score >= 6 ? "urgent" : score >= 4 ? "high" : score <= 1 ? "low" : "medium";
  return { priority, reasons };
}
