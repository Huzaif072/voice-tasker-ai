import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { requireAuth } from "@/lib/auth/middleware";
import { connectWithRetry } from "@/lib/db/mongodb";
import { getUsersCollection } from "@/lib/db/models/User";
import { getTasksCollection } from "@/lib/db/models/Task";
import { getNotificationsCollection } from "@/lib/db/models/Notification";
import { getVoiceSessionsCollection } from "@/lib/db/models/VoiceSession";
import { accountDeleteSchema } from "@/lib/validators/account";

export async function DELETE(request: Request) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const parsed = accountDeleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Type DELETE to confirm account removal" }, { status: 400 });
  }
  if (!ObjectId.isValid(auth.user.id)) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  try {
    const db = await connectWithRetry();
    const [users, tasks, notifications, sessions] = await Promise.all([
      getUsersCollection(db),
      getTasksCollection(db),
      getNotificationsCollection(db),
      getVoiceSessionsCollection(db),
    ]);

    await Promise.all([
      tasks.deleteMany({ createdBy: auth.user.id }),
      notifications.deleteMany({ userId: auth.user.id }),
      sessions.deleteMany({ userId: auth.user.id }),
    ]);
    const deleted = await users.deleteOne({ _id: new ObjectId(auth.user.id) });
    if (deleted.deletedCount === 0) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    const response = NextResponse.json({ success: true });
    response.cookies.set("token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    });
    return response;
  } catch (error) {
    console.error("Account deletion error:", error);
    return NextResponse.json({ error: "Unable to delete account" }, { status: 503 });
  }
}
