import type { Db } from "mongodb";
import { getRealtimeEventsCollection, type RealtimeEventName } from "@/lib/db/models/RealtimeEvent";
import { SOCKET_EVENTS } from "@/lib/socket/server";

const socketEventByName: Record<RealtimeEventName, string> = {
  task_created: SOCKET_EVENTS.TASK_CREATED,
  task_updated: SOCKET_EVENTS.TASK_UPDATED,
  task_deleted: SOCKET_EVENTS.TASK_DELETED,
  assignment_changed: SOCKET_EVENTS.NOTIFICATION,
  notification_created: SOCKET_EVENTS.NOTIFICATION,
};

async function publishToSocket(userId: string, name: RealtimeEventName, taskId?: string) {
  const baseUrl = process.env.SOCKET_SERVER_URL?.trim().replace(/\/$/, "");
  const token = process.env.SOCKET_INTERNAL_TOKEN?.trim();
  if (!baseUrl || !token) return;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1_500);
  try {
    await fetch(`${baseUrl}/publish`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ userIds: [userId], event: socketEventByName[name], data: { taskId, name } }),
      signal: controller.signal,
      cache: "no-store",
    });
  } catch {
    // Socket.IO is additive; MongoDB event-feed fallback remains authoritative.
  } finally {
    clearTimeout(timeout);
  }
}

export async function recordRealtimeEvent(db: Db, userId: string, name: RealtimeEventName, taskId?: string) {
  try {
    const events = await getRealtimeEventsCollection(db);
    await events.insertOne({ userId, name, taskId, createdAt: new Date().toISOString() });
  } catch {
    // Realtime delivery is additive; a failed event record must not fail the primary mutation.
  }
  void publishToSocket(userId, name, taskId);
}
