import { NextResponse } from "next/server";
import { parseNotificationId } from "@/lib/notifications/ids";
import { requireAuth } from "@/lib/auth/middleware";
import { connectWithRetry } from "@/lib/db/mongodb";
import { getNotificationsCollection } from "@/lib/db/models/Notification";

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const db = await connectWithRetry();
    const notifications = await getNotificationsCollection(db);
    const items = await notifications
      .find({ userId: auth.user.id })
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();

    return NextResponse.json({
      notifications: items.map((n) => ({ ...n, _id: n._id?.toString() })),
    });
  } catch (error) {
    console.error("Notification lookup error:", error);
    return NextResponse.json({ error: "Failed to load notifications" }, { status: 503 });
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  let id: unknown;
  try {
    ({ id } = await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const notificationId = parseNotificationId(id);
  if (!notificationId) {
    return NextResponse.json({ error: "Invalid notification ID" }, { status: 400 });
  }

  try {
    const db = await connectWithRetry();
    const notifications = await getNotificationsCollection(db);
    const result = await notifications.updateOne(
      { _id: notificationId, userId: auth.user.id },
      { $set: { read: true } }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to update notification" }, { status: 503 });
  }
}
