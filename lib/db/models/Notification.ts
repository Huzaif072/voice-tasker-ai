import type { Db, Collection, ObjectId } from "mongodb";
import type { Notification } from "@/types/notification";

export type NotificationDocument = Omit<Notification, "_id" | "expiresAt"> & { _id?: ObjectId; expiresAt?: Date };
export const NOTIFICATIONS_COLLECTION = "notifications";
let indexesPromise: Promise<void> | null = null;

export async function getNotificationsCollection(db: Db): Promise<Collection<NotificationDocument>> {
  const col = db.collection<NotificationDocument>(NOTIFICATIONS_COLLECTION);
  if (!indexesPromise) {
    indexesPromise = Promise.all([
      col.createIndex({ userId: 1, read: 1, createdAt: -1 }),
      col.createIndex({ reminderKey: 1 }, { unique: true, sparse: true }),
      col.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    ]).then(() => undefined).catch((error) => { indexesPromise = null; throw error; });
  }
  await indexesPromise;
  return col;
}
