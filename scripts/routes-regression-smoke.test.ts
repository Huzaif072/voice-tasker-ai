import assert from "node:assert/strict";
import { GET as getReminderSettings } from "../app/api/account/reminders/route";
import { GET as getPushStatus } from "../app/api/account/push-subscription/route";
import { DELETE as deleteAccount } from "../app/api/account/route";
import { POST as runReminders } from "../app/api/scheduled/reminders/route";
import { GET as getProviderHealth } from "../app/api/health/providers/route";
import { GET as getVoiceHistory } from "../app/api/voice/history/route";
import { POST as postFeedback } from "../app/api/analytics/feedback/route";
import { POST as postDeadline } from "../app/api/ai/deadline/route";
import { POST as postCalendarEvent } from "../app/api/calendar/events/route";

async function main() {
  const unauthenticated = new Request("http://localhost/api/account/reminders");
  assert.equal((await getReminderSettings(unauthenticated)).status, 401);
  assert.equal((await getPushStatus(new Request("http://localhost/api/account/push-subscription"))).status, 401);
  assert.equal((await getProviderHealth(new Request("http://localhost/api/health/providers"))).status, 401);
  assert.equal((await getVoiceHistory(new Request("http://localhost/api/voice/history"))).status, 401);
  assert.equal((await postFeedback(new Request("http://localhost/api/analytics/feedback", { method: "POST", body: JSON.stringify({ category: "voice", rating: "positive" }) }))).status, 401);
  assert.equal((await postDeadline(new Request("http://localhost/api/ai/deadline", { method: "POST", body: JSON.stringify({ taskId: "507f1f77bcf86cd799439011" }) }))).status, 401);
  assert.equal((await postCalendarEvent(new Request("http://localhost/api/calendar/events", { method: "POST", body: JSON.stringify({ taskId: "507f1f77bcf86cd799439011" }) }))).status, 401);
  assert.equal((await deleteAccount(new Request("http://localhost/api/account", { method: "DELETE", body: JSON.stringify({ confirmation: "DELETE" }) }))).status, 401);

  const previousSecret = process.env.REMINDER_WORKER_SECRET;
  delete process.env.REMINDER_WORKER_SECRET;
  assert.equal((await runReminders(new Request("http://localhost/api/scheduled/reminders", { method: "POST" }))).status, 401);
  if (previousSecret) process.env.REMINDER_WORKER_SECRET = previousSecret;

  console.log("PASS: account, push, scheduler, and health-adjacent route boundaries reject unauthenticated requests safely.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
