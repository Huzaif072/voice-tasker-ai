import assert from "node:assert/strict";
import { GET as getReminderSettings } from "../app/api/account/reminders/route";
import { GET as getPushStatus } from "../app/api/account/push-subscription/route";
import { DELETE as deleteAccount } from "../app/api/account/route";
import { POST as runReminders } from "../app/api/scheduled/reminders/route";

async function main() {
  const unauthenticated = new Request("http://localhost/api/account/reminders");
  assert.equal((await getReminderSettings(unauthenticated)).status, 401);
  assert.equal((await getPushStatus(new Request("http://localhost/api/account/push-subscription"))).status, 401);
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
