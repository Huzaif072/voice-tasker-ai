import { connectWithRetry } from "../lib/db/mongodb";
import { REMINDER_DELIVERIES_COLLECTION } from "../lib/db/models/ReminderDelivery";

const requiredIndexes = [
  { key: { reminderKey: 1, channel: 1 }, unique: true },
  { key: { status: 1, nextAttemptAt: 1 } },
  { key: { userId: 1, createdAt: -1 } },
  { key: { expiresAt: 1 }, expireAfterSeconds: 0 },
];

function sameKey(actual: Record<string, unknown>, expected: Record<string, unknown>): boolean {
  return JSON.stringify(actual) === JSON.stringify(expected);
}

async function main() {
  const db = await connectWithRetry();
  const indexes = await db.collection(REMINDER_DELIVERIES_COLLECTION).listIndexes().toArray();
  const missing = requiredIndexes.filter((required) => !indexes.some((actual) => (
    sameKey(actual.key as Record<string, unknown>, required.key) &&
    (required.unique === undefined || actual.unique === required.unique) &&
    (required.expireAfterSeconds === undefined || actual.expireAfterSeconds === required.expireAfterSeconds)
  )));
  if (missing.length > 0) {
    throw new Error(`Missing reminder indexes: ${missing.map(({ key }) => JSON.stringify(key)).join(", ")}`);
  }
  console.log(`PASS: ${REMINDER_DELIVERIES_COLLECTION} indexes are present and configured.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
