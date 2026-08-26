import assert from "node:assert/strict";
import { delegationSchema } from "@/lib/validators/delegation";
import { taskSchema, taskUpdateSchema } from "@/lib/validators/task";
import { basicRegexIntent } from "@/lib/groq/intent-parser";
import { GROQ_MODEL } from "@/lib/groq/client";
import { suggestDeadline, suggestPriority } from "@/lib/tasks/prioritize";
import { buildCalendarComposeLink } from "@/lib/calendar/link";
import { calendarEventInputSchema, feedbackInputSchema } from "@/lib/validators/ai";
import { getGoogleAuthUrl } from "@/lib/auth/google";
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
assert.equal(["llama-3.1-8b-instant", "llama-3.3-70b-versatile"].includes(GROQ_MODEL), false);

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
const deadline = suggestDeadline({ ...task, dueDate: undefined, priority: "high" });
assert.equal(typeof deadline.dueDate, "string");
assert.match(buildCalendarComposeLink("Review report", new Date().toISOString()) ?? "", /^https:\/\/calendar\.google\.com\/calendar\/render\?/);
assert.equal(feedbackInputSchema.safeParse({ category: "voice", rating: "positive" }).success, true);
assert.equal(feedbackInputSchema.safeParse({ category: "voice", rating: "maybe" }).success, false);
assert.equal(calendarEventInputSchema.safeParse({ taskId: "507f1f77bcf86cd799439011" }).success, true);
assert.equal(taskUpdateSchema.safeParse({ priority: "high", baseUpdatedAt: new Date().toISOString() }).success, true);
const previousGoogleCalendar = process.env.GOOGLE_CALENDAR_ENABLED;
const previousGoogleWrite = process.env.GOOGLE_CALENDAR_WRITE_ENABLED;
const previousClientId = process.env.GOOGLE_CLIENT_ID;
const previousNextAuthUrl = process.env.NEXTAUTH_URL;
process.env.GOOGLE_CALENDAR_ENABLED = "true";
process.env.GOOGLE_CALENDAR_WRITE_ENABLED = "true";
process.env.GOOGLE_CLIENT_ID = "client-id";
process.env.NEXTAUTH_URL = "http://localhost:3000";
assert.match(decodeURIComponent(getGoogleAuthUrl("state")).toString(), /https:\/\/www\.googleapis\.com\/auth\/calendar(?!\.readonly)/);
if (previousGoogleCalendar === undefined) delete process.env.GOOGLE_CALENDAR_ENABLED; else process.env.GOOGLE_CALENDAR_ENABLED = previousGoogleCalendar;
if (previousGoogleWrite === undefined) delete process.env.GOOGLE_CALENDAR_WRITE_ENABLED; else process.env.GOOGLE_CALENDAR_WRITE_ENABLED = previousGoogleWrite;
if (previousClientId === undefined) delete process.env.GOOGLE_CLIENT_ID; else process.env.GOOGLE_CLIENT_ID = previousClientId;
if (previousNextAuthUrl === undefined) delete process.env.NEXTAUTH_URL; else process.env.NEXTAUTH_URL = previousNextAuthUrl;

const encrypted = encryptSecret("calendar-token");
assert.equal(decryptSecret(encrypted), "calendar-token");

console.log("All-gaps regression smoke tests passed");
