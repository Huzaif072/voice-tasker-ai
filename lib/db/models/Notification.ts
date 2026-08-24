import type { Db, Collection, ObjectId } from "mongodb";
import type { Notification } from "@/types/notification";

export type NotificationDocument = Omit<Notification, "_id"> & { _id?: ObjectId };

export const NOTIFICATIONS_COLLECTION = "notifications";

export async function getNotificationsCollection(
  db: Db
): Promise<Collection<NotificationDocument>> {
  const col = db.collection<NotificationDocument>(NOTIFICATIONS_COLLECTION);
  await col.createIndex({ userId: 1, read: 1, createdAt: -1 });
  return col;
}
