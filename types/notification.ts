export type NotificationType =
  | "task_reminder"
  | "task_delegated"
  | "task_completed"
  | "voice_summary"
  | "system";

export interface Notification {
  _id?: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  taskId?: string;
  createdAt: string;
}
