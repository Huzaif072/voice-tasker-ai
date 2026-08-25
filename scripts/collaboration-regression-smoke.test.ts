import assert from "node:assert/strict";
import { buildBehaviorProfile } from "../lib/tasks/behavior";
import { normalizeTask } from "../lib/tasks/normalize";
import { suggestPriority } from "../lib/tasks/prioritize";
import { buildTaskFilter, taskQuerySchema } from "../lib/tasks/query";

const completedTasks = [
  normalizeTask({ title: "Budget review", status: "completed", priority: "high", tags: ["work"], createdBy: "user", createdAt: "2026-08-20T08:00:00.000Z", updatedAt: "2026-08-20T10:00:00.000Z" }),
  normalizeTask({ title: "Work planning", status: "completed", priority: "urgent", tags: ["work"], createdBy: "user", createdAt: "2026-08-21T08:00:00.000Z", updatedAt: "2026-08-21T10:00:00.000Z" }),
  normalizeTask({ title: "Personal reading", status: "completed", priority: "low", tags: ["personal"], createdBy: "user", createdAt: "2026-08-22T08:00:00.000Z", updatedAt: "2026-08-22T10:00:00.000Z" }),
];
const profile = buildBehaviorProfile(completedTasks);
assert.equal(profile.completionByTag?.work, 2);
assert.equal(profile.highPriorityByTag?.work, 2);
const suggestion = suggestPriority(normalizeTask({ title: "Prepare work update", status: "pending", priority: "low", tags: ["work"], createdBy: "user", createdAt: "2026-08-23T08:00:00.000Z", updatedAt: "2026-08-23T08:00:00.000Z" }), completedTasks, new Date("2026-08-23T08:00:00.000Z"), profile);
assert.ok(suggestion.reasons.some((reason) => reason.includes("history favors high priority")));

const assignedQuery = taskQuerySchema.parse({ scope: "assigned" });
assert.deepEqual(buildTaskFilter("recipient", assignedQuery), { assigneeUserId: "recipient" });
const ownerQuery = taskQuerySchema.parse({});
assert.deepEqual(buildTaskFilter("owner", ownerQuery), { createdBy: "owner" });

console.log("PASS: assignment query isolation and behavior-profile priority suggestions are covered");
