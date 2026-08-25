export type TaskStatus = "pending" | "in_progress" | "completed" | "cancelled";
export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type DelegationStatus = "none" | "pending" | "sent" | "accepted" | "declined" | "failed";
export type ContextRecurrence = "hourly" | "daily" | "weekly";

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface ContextTrigger {
  type: "location" | "time" | "calendar" | "weather" | "keyword";
  value: string;
  latitude?: number;
  longitude?: number;
  radiusMeters?: number;
  condition?: string;
  recurrence?: ContextRecurrence;
  lastTriggeredAt?: string;
}

export interface Task {
  _id?: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string;
  reminderAt?: string;
  durationMinutes?: number;
  calendarQuery?: string;
  subtasks: Subtask[];
  dependencies: string[];
  contextTriggers: ContextTrigger[];
  delegatedTo?: string;
  delegatedPhone?: string;
  delegationStatus: DelegationStatus;
  createdBy: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface TaskFilters {
  status?: TaskStatus;
  priority?: TaskPriority;
  search?: string;
}
