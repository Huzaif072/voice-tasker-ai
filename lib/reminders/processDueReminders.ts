import { ObjectId, type Db } from "mongodb";
import { getTasksCollection } from "@/lib/db/models/Task";
import { getNotificationsCollection } from "@/lib/db/models/Notification";
import { getUsersCollection, defaultReminderSettings, type UserDocument } from "@/lib/db/models/User";
import { getReminderDeliveriesCollection, type ReminderDeliveryDocument } from "@/lib/db/models/ReminderDelivery";
import { sendEmailResult } from "@/lib/notifications/email";
import { sendPushNotificationResult } from "@/lib/notifications/push";
import { encryptUserText } from "@/lib/privacy/fieldEncryption";
import { notificationExpiresAt } from "@/lib/privacy/retention";

const MAX_REMINDERS_PER_RUN = 100;
const MAX_DELIVERIES_PER_RUN = 100;
const MAX_DELIVERY_ATTEMPTS = 5;
const DELIVERY_LEASE_MS = 2 * 60 * 1000;
const DELIVERY_RETENTION_MS = 90 * 24 * 60 * 60 * 1000;

export interface ReminderRunResult {
  scanned: number;
  created: number;
  deliveriesClaimed: number;
  deliveriesSent: number;
  deliveriesFailed: number;
  deliveriesCancelled: number;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>\"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '\"': "&quot;",
    "'": "&#39;",
  })[character] ?? character);
}

function userObjectId(userId: string): ObjectId | undefined {
  return ObjectId.isValid(userId) ? new ObjectId(userId) : undefined;
}

function retryAt(now: Date, attempts: number): string {
  const delayMs = Math.min(60 * 60 * 1000, 60 * 1000 * (2 ** Math.max(0, attempts - 1)));
  return new Date(now.getTime() + delayMs).toISOString();
}

async function queueDelivery(
  deliveries: Awaited<ReturnType<typeof getReminderDeliveriesCollection>>,
  task: { _id?: ObjectId; createdBy: string; title: string },
  reminderKey: string,
  channel: "email" | "push",
  now: Date,
) {
  if (!task._id) return;
  try {
    await deliveries.updateOne(
      { reminderKey, channel },
      {
        $setOnInsert: {
          reminderKey,
          userId: task.createdBy,
          taskId: task._id.toString(),
          taskTitle: task.title,
          channel,
          status: "pending",
          attempts: 0,
          nextAttemptAt: now.toISOString(),
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
        },
      },
      { upsert: true },
    );
  } catch (error) {
    if ((error as { code?: number }).code !== 11000) throw error;
  }
}

async function claimDelivery(
  deliveries: Awaited<ReturnType<typeof getReminderDeliveriesCollection>>,
  now: Date,
): Promise<ReminderDeliveryDocument | null> {
  const nowIso = now.toISOString();
  const result = await deliveries.findOneAndUpdate(
    {
      attempts: { $lt: MAX_DELIVERY_ATTEMPTS },
      $or: [
        { status: "pending", nextAttemptAt: { $lte: nowIso } },
        { status: "sending", leaseUntil: { $lte: nowIso } },
      ],
    },
    {
      $set: {
        status: "sending",
        leaseUntil: new Date(now.getTime() + DELIVERY_LEASE_MS).toISOString(),
        updatedAt: nowIso,
      },
      $inc: { attempts: 1 },
    },
    { sort: { nextAttemptAt: 1 }, returnDocument: "after" },
  );
  return result;
}

async function deliver(
  delivery: ReminderDeliveryDocument,
  user: UserDocument | undefined,
): Promise<{ sent: boolean; permanentFailure: boolean; error?: string }> {
  if (!user) return { sent: false, permanentFailure: true, error: "Owner account no longer exists" };
  if (delivery.channel === "email" && user.email) {
    const result = await sendEmailResult({
      to: user.email,
      subject: `Reminder: ${delivery.taskTitle}`,
      html: `<p>You asked to be reminded about <strong>${escapeHtml(delivery.taskTitle)}</strong>.</p>`,
    });
    return { sent: result.ok, permanentFailure: result.permanentFailure, error: result.error };
  }
  if (delivery.channel === "push" && user.pushSubscription) {
    const result = await sendPushNotificationResult(user.pushSubscription, {
      title: "Task reminder",
      body: delivery.taskTitle,
      url: `/dashboard/tasks?task=${delivery.taskId}`,
    });
    return { sent: result.ok, permanentFailure: result.permanentFailure, error: result.error };
  }
  return { sent: false, permanentFailure: true, error: "Delivery channel is no longer configured" };
}

export async function processDueReminders(db: Db, now = new Date()): Promise<ReminderRunResult> {
  const tasks = await getTasksCollection(db);
  const notifications = await getNotificationsCollection(db);
  const users = await getUsersCollection(db);
  const deliveries = await getReminderDeliveriesCollection(db);
  const dueTasks = await tasks.find({
    reminderAt: { $type: "string", $lte: now.toISOString() },
    status: { $nin: ["completed", "cancelled"] },
  }).sort({ reminderAt: 1 }).limit(MAX_REMINDERS_PER_RUN).toArray();

  const ids = dueTasks.map((task) => userObjectId(task.createdBy)).filter((id): id is ObjectId => Boolean(id));
  const userRows = await users.find(
    { _id: { $in: ids } },
    { projection: { email: 1, pushSubscription: 1, reminderSettings: 1 } },
  ).toArray();
  const userById = new Map(userRows.map((user) => [user._id?.toString(), user]));

  let created = 0;
  for (const task of dueTasks) {
    if (!task._id || !task.reminderAt || !task.createdBy) continue;
    const user = userById.get(task.createdBy) as UserDocument | undefined;
    if (!user) continue;
    const settings = user.reminderSettings ?? defaultReminderSettings;
    if (!settings.enabled) continue;

    const reminderKey = `${task._id.toString()}:${task.reminderAt}`;
    if (settings.channels.includes("in_app")) {
      try {
        await notifications.insertOne({
          userId: task.createdBy,
          type: "task_reminder",
          title: "Task reminder",
          message: encryptUserText(task.title),
          read: false,
          taskId: task._id.toString(),
          reminderKey,
          createdAt: now.toISOString(),
          expiresAt: notificationExpiresAt(),
        });
        created += 1;
      } catch (error) {
        if ((error as { code?: number }).code !== 11000) throw error;
      }
    }
    if (settings.channels.includes("email") && user.email) await queueDelivery(deliveries, task, reminderKey, "email", now);
    if (settings.channels.includes("push") && user.pushSubscription) await queueDelivery(deliveries, task, reminderKey, "push", now);
  }

  let deliveriesClaimed = 0;
  let deliveriesSent = 0;
  let deliveriesFailed = 0;
  let deliveriesCancelled = 0;
  for (let index = 0; index < MAX_DELIVERIES_PER_RUN; index += 1) {
    const delivery = await claimDelivery(deliveries, now);
    if (!delivery) break;
    deliveriesClaimed += 1;
    const updatedAt = now.toISOString();
    const deliveryTaskId = userObjectId(delivery.taskId);
    const latestTask = deliveryTaskId
      ? await tasks.findOne({ _id: deliveryTaskId, createdBy: delivery.userId }, { projection: { status: 1 } })
      : null;
    if (!latestTask || latestTask.status === "completed" || latestTask.status === "cancelled") {
      deliveriesCancelled += 1;
      await deliveries.updateOne(
        { _id: delivery._id, status: "sending" },
        { $set: { status: "cancelled", lastError: "Task is no longer active", updatedAt, expiresAt: new Date(now.getTime() + DELIVERY_RETENTION_MS) }, $unset: { leaseUntil: "" } },
      );
      continue;
    }
    let deliveryUser = userById.get(delivery.userId) as UserDocument | undefined;
    if (!deliveryUser) {
      const id = userObjectId(delivery.userId);
      if (id) {
        const fetchedUser = await users.findOne({ _id: id }, { projection: { email: 1, pushSubscription: 1 } });
        if (fetchedUser) deliveryUser = fetchedUser;
      }
    }
    const outcome = await deliver(delivery, deliveryUser);
    if (outcome.sent) {
      deliveriesSent += 1;
      await deliveries.updateOne(
        { _id: delivery._id, status: "sending" },
        { $set: { status: "sent", updatedAt, expiresAt: new Date(now.getTime() + DELIVERY_RETENTION_MS) }, $unset: { leaseUntil: "", lastError: "" } },
      );
    } else if (outcome.permanentFailure || delivery.attempts >= MAX_DELIVERY_ATTEMPTS) {
      deliveriesFailed += 1;
      if (outcome.permanentFailure && delivery.channel === "push") {
        const id = userObjectId(delivery.userId);
        if (id) await users.updateOne({ _id: id }, { $unset: { pushSubscription: "", pushSubscriptionUpdatedAt: "" } });
      }
      await deliveries.updateOne(
        { _id: delivery._id, status: "sending" },
        { $set: { status: "failed", lastError: outcome.error ?? "Delivery provider rejected the notification", updatedAt, expiresAt: new Date(now.getTime() + DELIVERY_RETENTION_MS) }, $unset: { leaseUntil: "" } },
      );
    } else {
      await deliveries.updateOne(
        { _id: delivery._id, status: "sending" },
        { $set: { status: "pending", nextAttemptAt: retryAt(now, delivery.attempts), lastError: outcome.error ?? "Delivery provider rejected the notification", updatedAt }, $unset: { leaseUntil: "", expiresAt: "" } },
      );
    }
  }

  return { scanned: dueTasks.length, created, deliveriesClaimed, deliveriesSent, deliveriesFailed, deliveriesCancelled };
}
