import { z } from "zod";

export const accountDeleteSchema = z.object({
  confirmation: z.literal("DELETE"),
});

export const reminderSettingsSchema = z.object({
  enabled: z.boolean(),
  channels: z.array(z.enum(["in_app", "email", "push", "voice"])).min(1).max(4).refine((channels) => channels.includes("in_app"), "In-app delivery must remain enabled"),
});

export const pushSubscriptionSchema = z.object({
  endpoint: z.string().url().max(2048),
  keys: z.object({
    p256dh: z.string().min(16).max(512),
    auth: z.string().min(8).max(512),
  }).strict(),
}).strict();

export type AccountDeleteInput = z.infer<typeof accountDeleteSchema>;
export type ReminderSettingsInput = z.infer<typeof reminderSettingsSchema>;
export type PushSubscriptionInput = z.infer<typeof pushSubscriptionSchema>;
