import type { Task, TaskPriority, TaskStatus } from "@/types/task";

const priorities: TaskPriority[] = ["low", "medium", "high", "urgent"];
const statuses: TaskStatus[] = ["pending", "in_progress", "completed", "cancelled"];

export function normalizeTask(input: Partial<Task>): Task {
  const priority = priorities.includes(input.priority as TaskPriority)
    ? (input.priority as TaskPriority)
    : "medium";
  const status = statuses.includes(input.status as TaskStatus)
    ? (input.status as TaskStatus)
    : "pending";

  return {
    _id: input._id?.toString(),
    title: typeof input.title === "string" && input.title.trim() ? input.title : "Untitled task",
    description: typeof input.description === "string" ? input.description : undefined,
    status,
    priority,
    dueDate: input.dueDate,
    reminderAt: input.reminderAt,
    durationMinutes: input.durationMinutes,
    calendarQuery: input.calendarQuery,
    calendarLink: input.calendarLink,
    subtasks: Array.isArray(input.subtasks) ? input.subtasks : [],
    dependencies: Array.isArray(input.dependencies) ? input.dependencies.filter((id): id is string => typeof id === "string") : [],
    contextTriggers: Array.isArray(input.contextTriggers) ? input.contextTriggers : [],
    delegatedTo: input.delegatedTo,
    delegatedPhone: input.delegatedPhone,
    delegationStatus: input.delegationStatus ?? (input.delegatedTo || input.delegatedPhone ? "pending" : "none"),
    createdBy: typeof input.createdBy === "string" ? input.createdBy : "",
    tags: Array.isArray(input.tags) ? input.tags.filter((tag): tag is string => typeof tag === "string") : [],
    createdAt: typeof input.createdAt === "string" ? input.createdAt : new Date().toISOString(),
    updatedAt: typeof input.updatedAt === "string" ? input.updatedAt : new Date().toISOString(),
  };
}
