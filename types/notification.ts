export type NotificationType =
  | "task_reminder"
  | "task_delegated"
  | "task_completed"
  | "voice_summary"
  | "context_trigger"
  | "delegation_status"
  | "system";

export interface Notification {
  _id?: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  taskId?: string;
  reminderKey?: string;
  action?: "assignment" | "reminder";
  actionLabel?: string;
  createdAt: string;
}
