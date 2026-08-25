import { z } from "zod";

export const accountDeleteSchema = z.object({
  confirmation: z.literal("DELETE"),
});

export const reminderSettingsSchema = z.object({
  enabled: z.boolean(),
  channels: z.array(z.enum(["in_app", "email", "push"])).min(1).max(3).refine((channels) => channels.includes("in_app"), "In-app delivery must remain enabled"),
});

export type AccountDeleteInput = z.infer<typeof accountDeleteSchema>;
export type ReminderSettingsInput = z.infer<typeof reminderSettingsSchema>;
