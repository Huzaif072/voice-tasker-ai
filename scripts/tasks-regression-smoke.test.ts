import { normalizeTask } from "../lib/tasks/normalize.ts";
import { taskUpdateSchema } from "../lib/validators/task.ts";
import { buildTaskFilter, taskQuerySchema } from "../lib/tasks/query.ts";

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

const editableTask = taskUpdateSchema.safeParse({
  title: "Updated task",
  status: "in_progress",
  priority: "high",
  dueDate: "2026-08-25T12:00:00.000Z",
  tags: ["work"],
  subtasks: [{ id: "subtask-1", title: "Review details", completed: false }],
});
if (!editableTask.success) throw new Error("Task detail edits should accept supported metadata and subtasks");

const parsedQuery = taskQuerySchema.safeParse({ page: "2", limit: "25", search: "quarterly", active: "false" });
if (!parsedQuery.success || parsedQuery.data.page !== 2 || parsedQuery.data.limit !== 25 || parsedQuery.data.active) {
  throw new Error("Task query parameters should parse bounded pagination and false boolean values correctly");
}
const queryFilter = buildTaskFilter("user-1", parsedQuery.data);
if (queryFilter.createdBy !== "user-1" || !queryFilter.$text || queryFilter.$text.$search !== "quarterly") {
  throw new Error("Task search filters must remain user-scoped and use the text-search contract");
}

console.log("PASS: legacy and malformed task records normalize safely; editable task payloads and query contracts validate.");
