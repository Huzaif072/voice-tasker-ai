import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { requireAuth } from "@/lib/auth/middleware";
import { connectWithRetry } from "@/lib/db/mongodb";
import { getUsersCollection } from "@/lib/db/models/User";
import { getTasksCollection } from "@/lib/db/models/Task";
import { getNotificationsCollection } from "@/lib/db/models/Notification";
import { getVoiceSessionsCollection } from "@/lib/db/models/VoiceSession";
import { sanitizeUserForExport } from "@/lib/account/export";

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

  try {
    const db = await connectWithRetry();
    const userId = new ObjectId(auth.user.id);
    const [user, tasks, notifications, sessions] = await Promise.all([
      getUsersCollection(db).then((collection) => collection.findOne({ _id: userId })),
      getTasksCollection(db).then((collection) => collection.find({ createdBy: auth.user.id }).toArray()),
      getNotificationsCollection(db).then((collection) => collection.find({ userId: auth.user.id }).toArray()),
      getVoiceSessionsCollection(db).then((collection) => collection.find({ userId: auth.user.id }).toArray()),
    ]);

    if (!user) return NextResponse.json({ error: "Account not found" }, { status: 404 });

    const payload = {
      exportedAt: new Date().toISOString(),
      user: sanitizeUserForExport(user),
      tasks: tasks.map(serialize),
      notifications: notifications.map(serialize),
      voiceSessions: sessions.map(serialize),
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
