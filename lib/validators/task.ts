import { z } from "zod";

export const taskSchema = z.object({
  title: z.string().min(1, "Title is required").max(500),
  description: z.string().max(5000).optional(),
  status: z.enum(["pending", "in_progress", "completed", "cancelled"]).default("pending"),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  dueDate: z.string().datetime().optional().or(z.literal("")),
  subtasks: z
    .array(
      z.object({
        id: z.string(),
        title: z.string(),
        completed: z.boolean(),
      })
    )
    .default([]),
  tags: z.array(z.string()).default([]),
  delegatedTo: z.string().email().optional(),
});

export const taskUpdateSchema = taskSchema.partial();

export type TaskInput = z.infer<typeof taskSchema>;
export type TaskUpdateInput = z.infer<typeof taskUpdateSchema>;
