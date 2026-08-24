import { NextResponse } from "next/server";
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
  } catch {
    return NextResponse.json({ notifications: [] });
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await request.json();
  const db = await connectWithRetry();
  const notifications = await getNotificationsCollection(db);
  await notifications.updateOne({ _id: id, userId: auth.user.id }, { $set: { read: true } });

  return NextResponse.json({ success: true });
}
