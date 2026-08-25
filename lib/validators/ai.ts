import { z } from "zod";

export const decomposeInputSchema = z.object({
  title: z.string().trim().min(1, "Title required").max(500),
  description: z.string().trim().max(5000).optional(),
});

export const followupInputSchema = z.object({
  taskId: z.string().trim().min(1, "Task ID required").max(100),
});

export const summaryInputSchema = z.object({
  period: z.enum(["daily", "weekly"]).default("daily"),
}).strict();

export type DecomposeInput = z.infer<typeof decomposeInputSchema>;
export type FollowupInput = z.infer<typeof followupInputSchema>;
export type SummaryInput = z.infer<typeof summaryInputSchema>;
