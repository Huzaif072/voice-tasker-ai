import type { Db } from "mongodb";
import { getRealtimeEventsCollection, type RealtimeEventName } from "@/lib/db/models/RealtimeEvent";

export async function recordRealtimeEvent(db: Db, userId: string, name: RealtimeEventName, taskId?: string) {
  try {
    const events = await getRealtimeEventsCollection(db);
    await events.insertOne({ userId, name, taskId, createdAt: new Date().toISOString() });
  } catch {
    // Realtime delivery is additive; a failed event record must not fail the primary mutation.
  }
}
