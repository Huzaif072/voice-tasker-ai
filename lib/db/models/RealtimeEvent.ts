import type { Collection, Db, ObjectId } from "mongodb";

export type RealtimeEventName = "task_created" | "task_updated" | "task_deleted" | "assignment_changed" | "notification_created";
export interface RealtimeEventDocument {
  _id?: ObjectId;
  userId: string;
  name: RealtimeEventName;
  taskId?: string;
  createdAt: string;
}

export const REALTIME_EVENTS_COLLECTION = "realtime_events";
let indexesPromise: Promise<void> | null = null;

export async function getRealtimeEventsCollection(db: Db): Promise<Collection<RealtimeEventDocument>> {
  const collection = db.collection<RealtimeEventDocument>(REALTIME_EVENTS_COLLECTION);
  if (!indexesPromise) {
    indexesPromise = Promise.all([
      collection.createIndex({ userId: 1, createdAt: -1 }),
      collection.createIndex({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 }),
    ]).then(() => undefined).catch((error) => { indexesPromise = null; throw error; });
  }
  await indexesPromise;
  return collection;
}
