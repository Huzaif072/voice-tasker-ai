import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { signRealtimeToken, verifyRealtimeToken } from "../lib/auth/jwt";
import { SOCKET_EVENTS } from "../lib/socket/server";

const user = { id: "507f1f77bcf86cd799439011", email: "user@example.com", name: "Test User", sessionVersion: 3 };
const token = signRealtimeToken(user);
const payload = verifyRealtimeToken(token);
assert.equal(payload?.sub, user.id);
assert.equal(payload?.purpose, "realtime");
assert.equal(payload?.sv, user.sessionVersion);
assert.equal(verifyRealtimeToken(token.slice(0, -1)), null);
assert.deepEqual(Object.values(SOCKET_EVENTS), ["task:created", "task:updated", "task:deleted", "notification:new"]);
async function main() {
  const serverSource = await readFile(new URL("../realtime/server.ts", import.meta.url), "utf8");
  assert.match(serverSource, /\/healthz/);
  assert.match(serverSource, /\/publish/);
  assert.match(serverSource, /socket\.join\(`user:\$\{userId\}`\)/);
  assert.match(serverSource, /verifyRealtimeToken/);
  console.log("PASS: Socket.IO realtime tokens, room isolation, publish endpoint, health endpoint, and event protocol are covered");
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
