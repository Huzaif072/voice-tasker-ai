import { delegationSchema } from "../lib/validators/delegation.ts";

const valid = delegationSchema.safeParse({
  taskId: "507f1f77bcf86cd799439011",
  email: "  TEAMMATE@EXAMPLE.COM ",
});
if (!valid.success || valid.data.email !== "teammate@example.com") {
  throw new Error("Expected delegation input to normalize a valid email address");
}

if (delegationSchema.safeParse({ taskId: "", email: "person@example.com" }).success) {
  throw new Error("Expected an empty delegation task ID to be rejected");
}
if (delegationSchema.safeParse({ taskId: "507f1f77bcf86cd799439011", email: "invalid" }).success) {
  throw new Error("Expected an invalid delegation email to be rejected");
}

console.log("PASS: delegation input validation normalizes and rejects unsafe requests.");
