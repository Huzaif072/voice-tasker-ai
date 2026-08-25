import { z } from "zod";

export const accountDeleteSchema = z.object({
  confirmation: z.literal("DELETE"),
});

export type AccountDeleteInput = z.infer<typeof accountDeleteSchema>;
