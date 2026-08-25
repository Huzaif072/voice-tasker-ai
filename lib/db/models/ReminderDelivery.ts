import type { Collection, Db, ObjectId } from "mongodb";

export type ReminderDeliveryChannel = "email" | "push";
export type ReminderDeliveryStatus = "pending" | "sending" | "sent" | "failed";

export interface ReminderDeliveryDocument {
  _id?: ObjectId;
  reminderKey: string;
  userId: string;
  taskId: string;
  taskTitle: string;
  channel: ReminderDeliveryChannel;
  status: ReminderDeliveryStatus;
  attempts: number;
  nextAttemptAt: string;
  leaseUntil?: string;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
}

export const REMINDER_DELIVERIES_COLLECTION = "reminder_deliveries";
let indexesPromise: Promise<void> | null = null;

export async function getReminderDeliveriesCollection(db: Db): Promise<Collection<ReminderDeliveryDocument>> {
  const collection = db.collection<ReminderDeliveryDocument>(REMINDER_DELIVERIES_COLLECTION);
  if (!indexesPromise) {
    indexesPromise = Promise.all([
      collection.createIndex({ reminderKey: 1, channel: 1 }, { unique: true }),
      collection.createIndex({ status: 1, nextAttemptAt: 1 }),
      collection.createIndex({ userId: 1, createdAt: -1 }),
    ]).then(() => undefined).catch((error) => {
      indexesPromise = null;
      throw error;
    });
  }
  await indexesPromise;
  return collection;
}
