import assert from "node:assert/strict";
import { classifyEmailFailure } from "../lib/notifications/email";
import { classifyPushFailure } from "../lib/notifications/push";

assert.equal(classifyEmailFailure({ responseCode: 550 }).permanentFailure, true);
assert.equal(classifyEmailFailure({ response: "550 5.1.1 mailbox unavailable" }).permanentFailure, true);
assert.equal(classifyEmailFailure({ code: "ECONNRESET" }).permanentFailure, false);
assert.equal(classifyPushFailure({ statusCode: 410 }).permanentFailure, true);
assert.equal(classifyPushFailure({ statusCode: 503 }).permanentFailure, false);
console.log("PASS: email and push delivery failures classify permanent recipient errors separately from transient provider errors.");
