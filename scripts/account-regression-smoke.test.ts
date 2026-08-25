import assert from "node:assert/strict";
import { ObjectId } from "mongodb";
import type { UserDocument } from "../lib/db/models/User";
import { MAX_EXPORT_RECORDS, sanitizeUserForExport } from "../lib/account/export";
import { pushSubscriptionSchema, reminderSettingsSchema } from "../lib/validators/account";

const user = {
  _id: new ObjectId("507f1f77bcf86cd799439011"),
  name: "Sample User",
  email: "sample@example.com",
  provider: "google" as const,
  providerId: "google-secret-id",
  linkedProviders: [{ provider: "google" as const, providerId: "linked-secret-id", linkedAt: "2026-01-01T00:00:00.000Z" }],
  password: "password-hash",
  passwordResetTokenHash: "reset-hash",
  emailVerificationTokenHash: "verification-hash",
  sessionVersion: 4,
  pushSubscription: { endpoint: "https://push.example", keys: { auth: "secret" } },
  voiceSettings: { language: "en-US", speed: 1, enabled: true },
  createdAt: "2026-01-01T00:00:00.000Z",
} as UserDocument;

assert.equal(MAX_EXPORT_RECORDS, 10_000);
assert.ok(MAX_EXPORT_RECORDS > 0);

const exported = sanitizeUserForExport(user) as Record<string, unknown>;
assert.deepEqual(exported, {
  id: "507f1f77bcf86cd799439011",
  name: "Sample User",
  email: "sample@example.com",
  provider: "google",
  emailVerifiedAt: undefined,
  voiceSettings: { language: "en-US", speed: 1, enabled: true },
  createdAt: "2026-01-01T00:00:00.000Z",
});
for (const forbidden of ["password", "providerId", "linkedProviders", "pushSubscription", "sessionVersion", "passwordResetTokenHash"]) {
  assert.equal(Object.hasOwn(exported, forbidden), false, `export must omit ${forbidden}`);
}

assert.equal(reminderSettingsSchema.safeParse({ enabled: true, channels: ["in_app", "email", "push"] }).success, true);
assert.equal(pushSubscriptionSchema.safeParse({ endpoint: "https://push.example/subscription", keys: { p256dh: "p".repeat(32), auth: "a".repeat(16) } }).success, true);
assert.equal(pushSubscriptionSchema.safeParse({ endpoint: "not-a-url", keys: { p256dh: "short", auth: "short" } }).success, false);
assert.equal(pushSubscriptionSchema.safeParse({ endpoint: "https://push.example/subscription", keys: { p256dh: "p".repeat(32), auth: "a".repeat(16), secret: "unexpected" } }).success, false);
assert.equal(reminderSettingsSchema.safeParse({ enabled: true, channels: ["email"] }).success, false);
assert.equal(reminderSettingsSchema.safeParse({ enabled: true, channels: ["fax"] }).success, false);
console.log("PASS: account export allowlisting and reminder preference contracts are covered.");
