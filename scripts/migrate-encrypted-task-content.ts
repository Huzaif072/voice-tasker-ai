import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { getTasksCollection } from "@/lib/db/models/Task";
import { encryptTaskDocument, ENCRYPTED_TASK_FIELDS } from "@/lib/privacy/taskEncryption";
import { getReminderDeliveriesCollection } from "@/lib/db/models/ReminderDelivery";
import { encryptUserJson, encryptUserText } from "@/lib/privacy/fieldEncryption";
import { getUsersCollection } from "@/lib/db/models/User";

function loadLocalEnvironment() {
  for (const filename of [".env.local", ".env"]) {
    const path = join(process.cwd(), filename);
    if (!existsSync(path)) continue;
    for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const separator = trimmed.indexOf("=");
      if (separator <= 0) continue;
      const key = trimmed.slice(0, separator).trim();
      let value = trimmed.slice(separator + 1).trim();
      if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
      if (process.env[key] === undefined) process.env[key] = value;
    }
    break;
  }
}

async function main() {
  loadLocalEnvironment();
  const { connectWithRetry } = await import("@/lib/db/mongodb");
  const db = await connectWithRetry();
  const tasks = await getTasksCollection(db);
  let migrated = 0;
  const cursor = tasks.find({ contentEncrypted: { $exists: false }, $or: ENCRYPTED_TASK_FIELDS.map((field) => ({ [field]: { $exists: true } })) });
  for await (const task of cursor) {
    const encrypted = encryptTaskDocument({ ...task, _id: task._id?.toString() }) as { contentEncrypted: string };
    const $unset = Object.fromEntries(ENCRYPTED_TASK_FIELDS.map((field) => [field, ""])) as Record<string, "">;
    await tasks.updateOne({ _id: task._id }, { $set: { contentEncrypted: encrypted.contentEncrypted }, $unset });
    migrated += 1;
  }
  const deliveries = await getReminderDeliveriesCollection(db);
  let deliveryMigrated = 0;
  const deliveryCursor = deliveries.find({ taskTitleEncrypted: { $exists: false }, taskTitle: { $exists: true } });
  for await (const delivery of deliveryCursor) {
    if (!delivery.taskTitle) continue;
    await deliveries.updateOne({ _id: delivery._id }, { $set: { taskTitleEncrypted: encryptUserText(delivery.taskTitle) }, $unset: { taskTitle: "" } });
    deliveryMigrated += 1;
  }
  const users = await getUsersCollection(db);
  let subscriptionMigrated = 0;
  const subscriptionCursor = users.find({ pushSubscriptionEncrypted: { $exists: false }, pushSubscription: { $exists: true } });
  for await (const user of subscriptionCursor) {
    if (!user.pushSubscription) continue;
    await users.updateOne({ _id: user._id }, { $set: { pushSubscriptionEncrypted: encryptUserJson(user.pushSubscription) }, $unset: { pushSubscription: "" } });
    subscriptionMigrated += 1;
  }
  console.log(`Encrypted ${migrated} task record(s), ${deliveryMigrated} reminder-delivery record(s), and ${subscriptionMigrated} push subscription(s).`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
