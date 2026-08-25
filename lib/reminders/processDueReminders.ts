import type { Db } from "mongodb";
import { getTasksCollection } from "@/lib/db/models/Task";
import { getNotificationsCollection } from "@/lib/db/models/Notification";

const MAX_REMINDERS_PER_RUN = 100;

export interface ReminderRunResult {
  scanned: number;
  created: number;
}

export async function processDueReminders(db: Db, now = new Date()): Promise<ReminderRunResult> {
  const tasks = await getTasksCollection(db);
  const notifications = await getNotificationsCollection(db);
  const dueTasks = await tasks.find({
    reminderAt: { $type: "string", $lte: now.toISOString() },
    status: { $nin: ["completed", "cancelled"] },
  }).sort({ reminderAt: 1 }).limit(MAX_REMINDERS_PER_RUN).toArray();

  let created = 0;
  for (const task of dueTasks) {
    if (!task._id || !task.reminderAt || !task.createdBy) continue;
    const reminderKey = `${task._id.toString()}:${task.reminderAt}`;
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
      created += 1;
    } catch (error) {
      if ((error as { code?: number }).code !== 11000) throw error;
    }
  }

  return { scanned: dueTasks.length, created };
}
