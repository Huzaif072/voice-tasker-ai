import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { requireAuth } from "@/lib/auth/middleware";
import { connectWithRetry } from "@/lib/db/mongodb";
import { getUsersCollection } from "@/lib/db/models/User";
import { getTasksCollection } from "@/lib/db/models/Task";
import { getNotificationsCollection } from "@/lib/db/models/Notification";
import { getVoiceSessionsCollection } from "@/lib/db/models/VoiceSession";
import { getReminderDeliveriesCollection } from "@/lib/db/models/ReminderDelivery";
import { MAX_EXPORT_RECORDS, sanitizeUserForExport } from "@/lib/account/export";
import { checkAccountExportRateLimit, getRetryAfterSeconds } from "@/lib/auth/rate-limit";

function serialize<T extends { _id?: ObjectId }>(value: T) {
  const { _id, ...rest } = value;
  return { ...rest, ...(typeof _id?.toString === "function" ? { id: _id.toString() } : {}) };
}

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  if (!ObjectId.isValid(auth.user.id)) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }
  const exportLimit = await checkAccountExportRateLimit(auth.user.id);
  if (!exportLimit.success) {
    return NextResponse.json(
      { error: "Account export already requested recently. Please try again later." },
      { status: 429, headers: { "Retry-After": String(getRetryAfterSeconds("account-export")) } },
    );
  }

  try {
    const db = await connectWithRetry();
    const userId = new ObjectId(auth.user.id);
    const [users, tasksCollection, notificationsCollection, sessionsCollection, deliveriesCollection] = await Promise.all([
      getUsersCollection(db),
      getTasksCollection(db),
      getNotificationsCollection(db),
      getVoiceSessionsCollection(db),
      getReminderDeliveriesCollection(db),
    ]);
    const taskFilter = { createdBy: auth.user.id };
    const notificationFilter = { userId: auth.user.id };
    const sessionFilter = { userId: auth.user.id };
    const deliveryFilter = { userId: auth.user.id };
    const [user, taskCount, notificationCount, sessionCount, deliveryCount] = await Promise.all([
      users.findOne({ _id: userId }),
      tasksCollection.countDocuments(taskFilter, { limit: MAX_EXPORT_RECORDS + 1 }),
      notificationsCollection.countDocuments(notificationFilter, { limit: MAX_EXPORT_RECORDS + 1 }),
      sessionsCollection.countDocuments(sessionFilter, { limit: MAX_EXPORT_RECORDS + 1 }),
      deliveriesCollection.countDocuments(deliveryFilter, { limit: MAX_EXPORT_RECORDS + 1 }),
    ]);

    if (!user) return NextResponse.json({ error: "Account not found" }, { status: 404 });
    if ([taskCount, notificationCount, sessionCount, deliveryCount].some((count) => count > MAX_EXPORT_RECORDS)) {
      return NextResponse.json(
        { error: "Account export is too large. Please contact support for a complete export." },
        { status: 413 },
      );
    }

    const [tasks, notifications, sessions, reminderDeliveries] = await Promise.all([
      tasksCollection.find(taskFilter).toArray(),
      notificationsCollection.find(notificationFilter).toArray(),
      sessionsCollection.find(sessionFilter).toArray(),
      deliveriesCollection.find(deliveryFilter).toArray(),
    ]);

    const payload = {
      exportedAt: new Date().toISOString(),
      user: sanitizeUserForExport(user),
      tasks: tasks.map(serialize),
      notifications: notifications.map(serialize),
      voiceSessions: sessions.map(serialize),
      reminderDeliveries: reminderDeliveries.map(serialize),
    };

    return new Response(JSON.stringify(payload, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="voicetasker-export-${new Date().toISOString().slice(0, 10)}.json"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("Account export error:", error);
    return NextResponse.json({ error: "Unable to export account data" }, { status: 503 });
  }
}
