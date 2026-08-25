import { z } from "zod";

const subtaskSchema = z.object({
  id: z.string().trim().min(1).max(100),
  title: z.string().trim().min(1, "Subtask title is required").max(500),
  completed: z.boolean(),
});

const tagSchema = z.string().trim().min(1, "Tags cannot be empty").max(50);
const titleSchema = z.string().trim().min(1, "Title is required").max(500);
const descriptionSchema = z.string().trim().max(5000);
const statusSchema = z.enum(["pending", "in_progress", "completed", "cancelled"]);
const prioritySchema = z.enum(["low", "medium", "high", "urgent"]);
const dueDateSchema = z.string().datetime().or(z.literal(""));
const reminderAtSchema = z.string().datetime().or(z.literal(""));
const delegatedToSchema = z.string().trim().toLowerCase().email().or(z.literal(""));

export const taskSchema = z.object({
  title: titleSchema,
  description: descriptionSchema.optional(),
  status: statusSchema.default("pending"),
  priority: prioritySchema.default("medium"),
  dueDate: dueDateSchema.optional(),
  reminderAt: reminderAtSchema.optional(),
  subtasks: z.array(subtaskSchema).max(100).default([]),
  tags: z.array(tagSchema).max(50).default([]),
  delegatedTo: delegatedToSchema.optional(),
});

export const taskUpdateSchema = z.object({
  title: titleSchema.optional(),
  description: descriptionSchema.optional(),
  status: statusSchema.optional(),
  priority: prioritySchema.optional(),
  dueDate: dueDateSchema.optional(),
  reminderAt: reminderAtSchema.optional(),
  subtasks: z.array(subtaskSchema).max(100).optional(),
  tags: z.array(tagSchema).max(50).optional(),
  delegatedTo: delegatedToSchema.optional(),
}).refine(
  (value) => Object.keys(value).length > 0,
  "At least one task field is required"
);

export type TaskInput = z.infer<typeof taskSchema>;
export type TaskUpdateInput = z.infer<typeof taskUpdateSchema>;
