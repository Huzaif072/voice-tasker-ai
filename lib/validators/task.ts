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
const durationMinutesSchema = z.number().int().min(1).max(24 * 60).optional();
const calendarQuerySchema = z.string().trim().max(200).or(z.literal(""));
const delegatedToSchema = z.string().trim().toLowerCase().email().or(z.literal(""));
const delegatedPhoneSchema = z.string().trim().regex(/^\+[1-9]\d{7,14}$/, "Phone must use international E.164 format").or(z.literal(""));
const dependencySchema = z.string().trim().regex(/^[a-f0-9]{24}$/i, "Invalid dependency ID");
const contextTriggerSchema = z.object({
  type: z.enum(["location", "time", "calendar", "weather", "keyword"]),
  value: z.string().trim().min(1).max(200),
  latitude: z.number().finite().min(-90).max(90).optional(),
  longitude: z.number().finite().min(-180).max(180).optional(),
  radiusMeters: z.number().int().min(25).max(100_000).optional(),
  condition: z.string().trim().max(100).optional(),
  lastTriggeredAt: z.string().datetime().optional(),
}).superRefine((value, context) => {
  if (value.type === "location" && (value.latitude === undefined || value.longitude === undefined)) {
    context.addIssue({ code: "custom", path: ["latitude"], message: "Location triggers require coordinates" });
  }
  if (value.type === "weather" && (value.latitude === undefined || value.longitude === undefined)) {
    context.addIssue({ code: "custom", path: ["latitude"], message: "Weather triggers require coordinates" });
  }
  if (value.type === "time" && !z.string().datetime().safeParse(value.value).success) {
    context.addIssue({ code: "custom", path: ["value"], message: "Time triggers require an ISO timestamp" });
  }
});

export const taskSchema = z.object({
  title: titleSchema,
  description: descriptionSchema.optional(),
  status: statusSchema.default("pending"),
  priority: prioritySchema.default("medium"),
  dueDate: dueDateSchema.optional(),
  reminderAt: reminderAtSchema.optional(),
  durationMinutes: durationMinutesSchema,
  calendarQuery: calendarQuerySchema.optional(),
  subtasks: z.array(subtaskSchema).max(100).default([]),
  dependencies: z.array(dependencySchema).max(50).default([]),
  contextTriggers: z.array(contextTriggerSchema).max(20).default([]),
  tags: z.array(tagSchema).max(50).default([]),
  delegatedTo: delegatedToSchema.optional(),
  delegatedPhone: delegatedPhoneSchema.optional(),
});

export const taskUpdateSchema = z.object({
  title: titleSchema.optional(),
  description: descriptionSchema.optional(),
  status: statusSchema.optional(),
  priority: prioritySchema.optional(),
  dueDate: dueDateSchema.optional(),
  reminderAt: reminderAtSchema.optional(),
  durationMinutes: durationMinutesSchema,
  calendarQuery: calendarQuerySchema.optional(),
  subtasks: z.array(subtaskSchema).max(100).optional(),
  dependencies: z.array(dependencySchema).max(50).optional(),
  contextTriggers: z.array(contextTriggerSchema).max(20).optional(),
  tags: z.array(tagSchema).max(50).optional(),
  delegatedTo: delegatedToSchema.optional(),
  delegatedPhone: delegatedPhoneSchema.optional(),
}).refine(
  (value) => Object.keys(value).length > 0,
  "At least one task field is required"
);

export type TaskInput = z.infer<typeof taskSchema>;
export type TaskUpdateInput = z.infer<typeof taskUpdateSchema>;
