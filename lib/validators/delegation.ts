import { z } from "zod";

export const delegationSchema = z.object({
  taskId: z.string().trim().min(1, "Task ID is required"),
  email: z.string().trim().toLowerCase().email("A valid email address is required").optional(),
  phone: z.string().trim().regex(/^\+[1-9]\d{7,14}$/, "Phone must use international E.164 format").optional(),
}).refine((value) => Boolean(value.email || value.phone), {
  path: ["email"],
  message: "Provide an email address or an E.164 phone number",
});

export type DelegationInput = z.infer<typeof delegationSchema>;
