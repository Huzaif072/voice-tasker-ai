export type TaskStatus = "pending" | "in_progress" | "completed" | "cancelled";
export type TaskPriority = "low" | "medium" | "high" | "urgent";

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface ContextTrigger {
  type: "location" | "time" | "keyword";
  value: string;
}

export interface Task {
  _id?: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string;
  reminderAt?: string;
  subtasks: Subtask[];
  contextTriggers: ContextTrigger[];
  delegatedTo?: string;
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
