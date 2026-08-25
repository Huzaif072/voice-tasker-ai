import { z } from "zod";

export const decomposeInputSchema = z.object({
  title: z.string().trim().min(1, "Title required").max(500),
  description: z.string().trim().max(5000).optional(),
});

export const followupInputSchema = z.object({
  taskId: z.string().trim().min(1, "Task ID required").max(100),
});

export const deadlineInputSchema = z.object({
  taskId: z.string().trim().regex(/^[a-f0-9]{24}$/i, "Invalid task ID"),
}).strict();

export const calendarEventInputSchema = z.object({
  taskId: z.string().trim().regex(/^[a-f0-9]{24}$/i, "Invalid task ID"),
}).strict();

export const feedbackInputSchema = z.object({
  category: z.enum(["voice", "priority", "deadline", "summary"]),
  rating: z.enum(["positive", "negative"]),
  conversationId: z.string().trim().regex(/^[a-zA-Z0-9_-]{8,100}$/).optional(),
}).strict();

export const summaryInputSchema = z.object({
  period: z.enum(["daily", "weekly"]).default("daily"),
}).strict();

export type DecomposeInput = z.infer<typeof decomposeInputSchema>;
export type FollowupInput = z.infer<typeof followupInputSchema>;
export type SummaryInput = z.infer<typeof summaryInputSchema>;
export type FeedbackInput = z.infer<typeof feedbackInputSchema>;
export type CalendarEventInput = z.infer<typeof calendarEventInputSchema>;
export type DeadlineInput = z.infer<typeof deadlineInputSchema>;
