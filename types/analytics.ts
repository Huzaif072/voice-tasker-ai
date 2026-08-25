export type AnalyticsEventName = "app_active" | "voice_session" | "task_created" | "task_completed" | "task_deleted" | "summary_requested" | "delegation_sent" | "feedback_submitted";

export interface AnalyticsEvent {
  _id?: string;
  userId: string;
  name: AnalyticsEventName;
  properties?: Record<string, string | number | boolean | undefined>;
  createdAt: string;
  expiresAt?: string;
}
