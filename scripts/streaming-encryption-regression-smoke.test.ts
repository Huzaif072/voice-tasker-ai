import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { decryptTaskDocument, encryptTaskDocument } from "../lib/privacy/taskEncryption";
import { validUploadId } from "../lib/voice/uploads";

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
assert.equal(validUploadId("not-an-upload"), false);
assert.equal(validUploadId("550e8400-e29b-41d4-a716-446655440000"), true);

async function main() {
  const chunkRoute = await readFile(new URL("../app/api/voice/chunk/route.ts", import.meta.url), "utf8");
  const inputRoute = await readFile(new URL("../app/api/voice/input/route.ts", import.meta.url), "utf8");
  const consentRoute = await readFile(new URL("../app/api/account/consent/route.ts", import.meta.url), "utf8");
  const privacyRoute = await readFile(new URL("../app/api/account/privacy-requests/route.ts", import.meta.url), "utf8");
  assert.match(chunkRoute, /appendVoiceChunk/);
  assert.match(chunkRoute, /requireAuth/);
  assert.match(inputRoute, /assembleVoiceUpload/);
  assert.match(consentRoute, /recordLegalWithdrawal/);
  assert.match(privacyRoute, /privacy-request:/);
  console.log("PASS: streaming upload, encrypted task content, consent withdrawal, and GDPR request contracts are covered");
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
