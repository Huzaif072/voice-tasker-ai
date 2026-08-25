import type { Db } from "mongodb";
import type { AnalyticsEvent, AnalyticsEventName } from "@/types/analytics";

const COLLECTION = "analytics_events";
let indexesPromise: Promise<void> | null = null;

export async function getAnalyticsCollection(db: Db) {
  const collection = db.collection<AnalyticsEvent>(COLLECTION);
  if (!indexesPromise) {
    indexesPromise = Promise.all([
      collection.createIndex({ userId: 1, createdAt: -1 }),
      collection.createIndex({ name: 1, createdAt: -1 }),
      collection.createIndex({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 730 }),
    ]).then(() => undefined).catch((error) => { indexesPromise = null; throw error; });
  }
  await indexesPromise;
  return collection;
}

const allowedNames = new Set<AnalyticsEventName>(["voice_session", "task_created", "task_completed", "task_deleted", "summary_requested", "delegation_sent", "feedback_submitted"]);

export async function trackEvent(db: Db, userId: string, name: AnalyticsEventName, properties?: AnalyticsEvent["properties"]) {
  if (!allowedNames.has(name)) return;
  const collection = await getAnalyticsCollection(db);
  await collection.insertOne({ userId, name, properties, createdAt: new Date().toISOString() });
}
