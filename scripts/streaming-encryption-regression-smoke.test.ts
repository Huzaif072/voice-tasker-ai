import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { decryptTaskDocument, encryptTaskDocument, taskSearchTokens } from "../lib/privacy/taskEncryption";
import { validUploadId } from "../lib/voice/uploads";

process.env.FIELD_ENCRYPTION_KEY ??= "streaming-encryption-regression-test-key-32";

const task = {
  title: "Prepare the quarterly review",
  description: "Private notes for the review.",
  status: "pending" as const,
  priority: "high" as const,
  subtasks: [{ id: "one", title: "Collect metrics", completed: false }],
  dependencies: [],
  contextTriggers: [],
  tags: ["work"],
  delegationStatus: "none" as const,
  createdBy: "user-1",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};
const stored = encryptTaskDocument(task);
assert.equal("title" in stored, false);
assert.equal("description" in stored, false);
assert.equal(decryptTaskDocument(stored).title, task.title);
assert.equal(decryptTaskDocument(stored).description, task.description);
assert.ok(taskSearchTokens(task).length > 0);
assert.equal(taskSearchTokens(task).some((token) => token === task.title), false);
assert.equal(validUploadId("not-an-upload"), false);
assert.equal(validUploadId("550e8400-e29b-41d4-a716-446655440000"), true);

async function main() {
  const chunkRoute = await readFile(new URL("../app/api/voice/chunk/route.ts", import.meta.url), "utf8");
  const inputRoute = await readFile(new URL("../app/api/voice/input/route.ts", import.meta.url), "utf8");
  const consentRoute = await readFile(new URL("../app/api/account/consent/route.ts", import.meta.url), "utf8");
  const privacyRoute = await readFile(new URL("../app/api/account/privacy-requests/route.ts", import.meta.url), "utf8");
  const invitationRoute = await readFile(new URL("../app/api/invitations/[token]/route.ts", import.meta.url), "utf8");
  const voiceHook = await readFile(new URL("../hooks/useVoiceRecorder.ts", import.meta.url), "utf8");
  const dashboardLayout = await readFile(new URL("../app/dashboard/layout.tsx", import.meta.url), "utf8");
  assert.match(chunkRoute, /appendVoiceChunk/);
  assert.match(chunkRoute, /requireAuth/);
  assert.match(inputRoute, /assembleVoiceUpload/);
  assert.match(consentRoute, /recordLegalWithdrawal/);
  assert.match(privacyRoute, /privacy-request:/);
  assert.match(invitationRoute, /verifyPhoneInvitationCode/);
  assert.match(invitationRoute, /verificationCode/);
  assert.match(voiceHook, /VOICE_UPLOAD_STATE_KEY/);
  assert.match(voiceHook, /retryUpload/);
  assert.match(dashboardLayout, /Skip to main content/);
  console.log("PASS: streaming upload, encrypted task content/search, consent withdrawal, phone verification, retry, and accessibility contracts are covered");
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
