import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { decryptUserText, encryptUserText } from "../lib/privacy/fieldEncryption";
import { analyticsExpiresAt, notificationExpiresAt, voiceSessionExpiresAt } from "../lib/privacy/retention";

const value = "A private voice transcript with a task title.";
const encrypted = encryptUserText(value);
assert.notEqual(encrypted, value);
assert.match(encrypted, /^v1:/);
assert.equal(decryptUserText(encrypted), value);
assert.equal(decryptUserText(value), value);
for (const expiry of [analyticsExpiresAt(), notificationExpiresAt(), voiceSessionExpiresAt()]) {
  assert.ok(expiry.getTime() > Date.now(), "retention expiration must be in the future");
}
async function main() {
  const invitationRoute = await readFile(new URL("../app/api/invitations/[token]/route.ts", import.meta.url), "utf8");
  assert.match(invitationRoute, /Sign in with the invited email address/);
  assert.match(invitationRoute, /status: \"pending\"/);
  console.log("PASS: encrypted user text, retention windows, and secure invitation acceptance contracts are covered");
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
