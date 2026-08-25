import assert from "node:assert/strict";
import { delegationSchema } from "@/lib/validators/delegation";
import { taskSchema } from "@/lib/validators/task";
import { basicRegexIntent } from "@/lib/groq/intent-parser";
import { suggestPriority } from "@/lib/tasks/prioritize";
import { decryptSecret, encryptSecret } from "@/lib/auth/secrets";
import type { Task } from "@/types/task";

process.env.JWT_SECRET = "test-secret-that-is-at-least-32-characters-long";

const parsedTask = taskSchema.safeParse({
  title: "Take umbrella",
  dependencies: ["507f1f77bcf86cd799439011"],
  contextTriggers: [{ type: "weather", value: "rain", latitude: 40, longitude: -73 }],
});
assert.equal(parsedTask.success, true);
assert.equal(taskSchema.safeParse({ title: "Invalid time", contextTriggers: [{ type: "time", value: "tomorrow" }] }).success, false);
assert.equal(taskSchema.safeParse({ title: "Valid time", contextTriggers: [{ type: "time", value: new Date().toISOString() }] }).success, true);
assert.equal(taskSchema.safeParse({ title: "Recurring time", contextTriggers: [{ type: "time", value: new Date().toISOString(), recurrence: "daily" }] }).success, true);
assert.equal(taskSchema.safeParse({ title: "Invalid recurrence", contextTriggers: [{ type: "weather", value: "rain", latitude: 40, longitude: -73, recurrence: "daily" }] }).success, false);
assert.equal(delegationSchema.safeParse({ taskId: "507f1f77bcf86cd799439011", phone: "+15551234567" }).success, true);
assert.equal(delegationSchema.safeParse({ taskId: "507f1f77bcf86cd799439011" }).success, false);

const intent = basicRegexIntent("Create a planning task for 90 minutes");
assert.equal(intent.durationMinutes, 90);

const task: Task = {
  _id: "507f1f77bcf86cd799439011",
  title: "Pay invoice",
  status: "pending",
  priority: "medium",
  dueDate: new Date(Date.now() - 3_600_000).toISOString(),
  subtasks: [],
  dependencies: [],
  contextTriggers: [],
  delegationStatus: "none",
  createdBy: "user",
  tags: ["finance"],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};
assert.equal(suggestPriority(task, [task]).priority, "urgent");

const encrypted = encryptSecret("calendar-token");
assert.equal(decryptSecret(encrypted), "calendar-token");

console.log("All-gaps regression smoke tests passed");
