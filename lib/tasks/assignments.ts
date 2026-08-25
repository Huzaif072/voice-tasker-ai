import type { Db } from "mongodb";
import { getNotificationsCollection } from "@/lib/db/models/Notification";
import { getUsersCollection } from "@/lib/db/models/User";
import { encryptUserText } from "@/lib/privacy/fieldEncryption";
import { notificationExpiresAt } from "@/lib/privacy/retention";

export async function findAssignableUser(db: Db, email?: string) {
  if (!email) return null;
  const users = await getUsersCollection(db);
  return users.findOne({ email: email.toLowerCase() }, { projection: { _id: 1, email: 1, name: 1 } });
}

export async function createAssignmentNotification(
  db: Db,
  recipientUserId: string,
  taskId: string,
  taskTitle: string,
  ownerName: string,
) {
  const notifications = await getNotificationsCollection(db);
  await notifications.insertOne({
    userId: recipientUserId,
    type: "task_delegated",
    title: "Task assignment request",
    message: encryptUserText(`${ownerName} assigned “${taskTitle}” to you.`),
    read: false,
    taskId,
    action: "assignment",
    actionLabel: "Review assignment",
    createdAt: new Date().toISOString(),
    expiresAt: notificationExpiresAt(),
  });
}

export async function createAssignmentStatusNotification(
  db: Db,
  ownerUserId: string,
  taskId: string,
  taskTitle: string,
  recipientName: string,
  status: "accepted" | "declined",
) {
  const notifications = await getNotificationsCollection(db);
  await notifications.insertOne({
    userId: ownerUserId,
    type: "delegation_status",
    title: `Assignment ${status}`,
    message: encryptUserText(`${recipientName} ${status} “${taskTitle}”.`),
    read: false,
    taskId,
    action: "assignment",
    actionLabel: "Open task",
    createdAt: new Date().toISOString(),
    expiresAt: notificationExpiresAt(),
  });
}
