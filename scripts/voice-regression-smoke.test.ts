import assert from "node:assert/strict";
import { basicRegexIntent, cleanTaskTitle, normalizeDueDate } from "../lib/groq/intent-parser.ts";
import { createVoiceConfirmation, verifyVoiceConfirmation } from "../lib/voice/confirmation.ts";
import { withTimeout } from "../lib/utils/withTimeout.ts";

async function main() {
  process.env.JWT_SECRET = process.env.JWT_SECRET ?? "voice-regression-test-secret";

  assert.equal(cleanTaskTitle("Please create a new task to prepare the launch brief"), "prepare the launch brief");
  assert.equal(cleanTaskTitle("delete the task called Prepare report"), "Prepare report");
  assert.equal(basicRegexIntent("delete the task called Prepare report").action, "delete");
  assert.equal(basicRegexIntent("show my overdue tasks").action, "query");
  assert.equal(basicRegexIntent("mark the task done").action, "update");
  assert.equal(normalizeDueDate("not-a-date"), undefined);

  const token = createVoiceConfirmation("user-1", "delete", "task-1");
  assert.equal(verifyVoiceConfirmation(token, "user-1", "delete", "task-1"), true);
  assert.equal(verifyVoiceConfirmation(token, "user-2", "delete", "task-1"), false);
  assert.equal(verifyVoiceConfirmation(token, "user-1", "update", "task-1"), false);
  assert.equal(verifyVoiceConfirmation(token, "user-1", "delete", "task-2"), false);

  assert.equal(await withTimeout(Promise.resolve("ok"), 100), "ok");
  await assert.rejects(() => withTimeout(new Promise(() => undefined), 5), /timed out/);

  console.log("PASS: voice parser, confirmation binding, and provider timeout contracts are covered.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
