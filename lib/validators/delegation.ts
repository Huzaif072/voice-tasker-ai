import { z } from "zod";

export const delegationSchema = z.object({
  taskId: z.string().trim().min(1, "Task ID is required"),
  email: z.string().trim().toLowerCase().email("A valid email address is required"),
});

export type DelegationInput = z.infer<typeof delegationSchema>;
