import { normalizeTask } from "../lib/tasks/normalize.ts";

const legacyTask = normalizeTask({
  _id: "legacy-task",
  title: "Legacy task",
  status: undefined,
  priority: undefined,
  subtasks: undefined,
  contextTriggers: undefined,
  tags: undefined,
  createdBy: "user-1",
  createdAt: "2026-08-25T00:00:00.000Z",
  updatedAt: "2026-08-25T00:00:00.000Z",
});

if (legacyTask.status !== "pending") throw new Error("Legacy task should default to pending status");
if (legacyTask.priority !== "medium") throw new Error("Legacy task should default to medium priority");
if (!Array.isArray(legacyTask.subtasks) || legacyTask.subtasks.length !== 0) {
  throw new Error("Legacy task should default to an empty subtasks array");
}
if (!Array.isArray(legacyTask.contextTriggers) || legacyTask.contextTriggers.length !== 0) {
  throw new Error("Legacy task should default to an empty contextTriggers array");
}
if (!Array.isArray(legacyTask.tags) || legacyTask.tags.length !== 0) {
  throw new Error("Legacy task should default to an empty tags array");
}

const malformedTask = normalizeTask({
  title: "Malformed task",
  priority: "not-a-priority" as never,
  status: "not-a-status" as never,
  tags: ["valid", 42] as never,
});

if (malformedTask.priority !== "medium" || malformedTask.status !== "pending") {
  throw new Error("Unrecognized task enum values should receive safe defaults");
}
if (malformedTask.tags.length !== 1 || malformedTask.tags[0] !== "valid") {
  throw new Error("Non-string tags should be discarded");
}

console.log("PASS: legacy and malformed task records normalize safely.");
