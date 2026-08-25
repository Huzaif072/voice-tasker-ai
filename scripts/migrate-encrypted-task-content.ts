import { connectWithRetry } from "@/lib/db/mongodb";
import { getTasksCollection } from "@/lib/db/models/Task";
import { encryptTaskDocument, ENCRYPTED_TASK_FIELDS } from "@/lib/privacy/taskEncryption";
import { getReminderDeliveriesCollection } from "@/lib/db/models/ReminderDelivery";
import { encryptUserJson, encryptUserText } from "@/lib/privacy/fieldEncryption";
import { getUsersCollection } from "@/lib/db/models/User";

async function main() {
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
