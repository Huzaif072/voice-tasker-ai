import { NextResponse } from "next/server";
import { parseNotificationId } from "@/lib/notifications/ids";
import { requireAuth } from "@/lib/auth/middleware";
import { connectWithRetry } from "@/lib/db/mongodb";
import { getNotificationsCollection } from "@/lib/db/models/Notification";
import { decryptUserText } from "@/lib/privacy/fieldEncryption";

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
      notifications: items.map((n) => ({ ...n, message: decryptUserText(n.message), expiresAt: n.expiresAt instanceof Date ? n.expiresAt.toISOString() : n.expiresAt, _id: n._id?.toString() })),
    });
  } catch (error) {
    console.error("Notification lookup error:", error);
    return NextResponse.json({ error: "Failed to load notifications" }, { status: 503 });
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const payload = body as { id?: unknown; all?: unknown };
  try {
    const db = await connectWithRetry();
    const notifications = await getNotificationsCollection(db);

    if (payload.all === true) {
      const result = await notifications.updateMany(
        { userId: auth.user.id, read: { $ne: true } },
        { $set: { read: true } }
      );
      return NextResponse.json({ success: true, updatedCount: result.modifiedCount });
    }

    const notificationId = parseNotificationId(payload.id);
    if (!notificationId) {
      return NextResponse.json({ error: "Invalid notification ID" }, { status: 400 });
    }

    const result = await notifications.updateOne(
      { _id: notificationId, userId: auth.user.id },
      { $set: { read: true } }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, updatedCount: result.modifiedCount });
  } catch (error) {
    console.error("Notification update error:", error);
    return NextResponse.json({ error: "Failed to update notifications" }, { status: 503 });
  }
}
