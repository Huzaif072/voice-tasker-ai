import { ObjectId, type Db } from "mongodb";
import { getTasksCollection } from "@/lib/db/models/Task";
import { getNotificationsCollection } from "@/lib/db/models/Notification";
import { getUsersCollection, defaultReminderSettings, type UserDocument } from "@/lib/db/models/User";
import { sendEmail } from "@/lib/notifications/email";
import { sendPushNotification } from "@/lib/notifications/push";

const MAX_REMINDERS_PER_RUN = 100;

export interface ReminderRunResult {
  scanned: number;
  created: number;
  deliveriesAttempted: number;
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

export async function processDueReminders(db: Db, now = new Date()): Promise<ReminderRunResult> {
  const tasks = await getTasksCollection(db);
  const notifications = await getNotificationsCollection(db);
  const users = await getUsersCollection(db);
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
  let deliveriesAttempted = 0;
  for (const task of dueTasks) {
    if (!task._id || !task.reminderAt || !task.createdBy) continue;
    const user = userById.get(task.createdBy) as UserDocument | undefined;
    const settings = user?.reminderSettings ?? defaultReminderSettings;
    if (!settings.enabled) continue;

    const reminderKey = `${task._id.toString()}:${task.reminderAt}`;
    let inserted = false;
    if (settings.channels.includes("in_app")) {
      try {
        await notifications.insertOne({
          userId: task.createdBy,
          type: "task_reminder",
          title: "Task reminder",
          message: task.title,
          read: false,
          taskId: task._id.toString(),
          reminderKey,
          createdAt: now.toISOString(),
        });
        inserted = true;
        created += 1;
      } catch (error) {
        if ((error as { code?: number }).code !== 11000) throw error;
      }
    }

    if (!inserted) continue;
    const safeTitle = escapeHtml(task.title);
    const deliveryPromises: Promise<boolean>[] = [];
    if (settings.channels.includes("email") && user?.email) {
      deliveryPromises.push(sendEmail({
        to: user.email,
        subject: `Reminder: ${task.title}`,
        html: `<p>You asked to be reminded about <strong>${safeTitle}</strong>.</p>`,
      }));
    }
    if (settings.channels.includes("push") && user?.pushSubscription) {
      deliveryPromises.push(sendPushNotification(user.pushSubscription, {
        title: "Task reminder",
        body: task.title,
        url: `/dashboard/tasks?task=${task._id.toString()}`,
      }));
    }
    deliveriesAttempted += deliveryPromises.length;
    if (deliveryPromises.length) await Promise.all(deliveryPromises);
  }

  return { scanned: dueTasks.length, created, deliveriesAttempted };
}
