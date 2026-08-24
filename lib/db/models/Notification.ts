import type { Db, Collection, ObjectId } from "mongodb";
import type { Notification } from "@/types/notification";

export type NotificationDocument = Omit<Notification, "_id"> & { _id?: ObjectId };
export const NOTIFICATIONS_COLLECTION = "notifications";
let indexesPromise: Promise<void> | null = null;

export async function getNotificationsCollection(db: Db): Promise<Collection<NotificationDocument>> {
  const col = db.collection<NotificationDocument>(NOTIFICATIONS_COLLECTION);
  if (!indexesPromise) {
    indexesPromise = col.createIndex({ userId: 1, read: 1, createdAt: -1 }).then(() => undefined).catch((error) => { indexesPromise = null; throw error; });
  }
  await indexesPromise;
  return col;
}
