import { NextResponse } from "next/server";
import { ObjectId, type ClientSession, type Db } from "mongodb";
import { requireAuth } from "@/lib/auth/middleware";
import { connectWithRetry, getMongoClient } from "@/lib/db/mongodb";
import { getUsersCollection } from "@/lib/db/models/User";
import { getTasksCollection } from "@/lib/db/models/Task";
import { getNotificationsCollection } from "@/lib/db/models/Notification";
import { getVoiceSessionsCollection } from "@/lib/db/models/VoiceSession";
import { getReminderDeliveriesCollection } from "@/lib/db/models/ReminderDelivery";
import { invalidateCache } from "@/lib/redis/ratelimit";
import { accountDeleteSchema } from "@/lib/validators/account";
import { getTaskInvitationsCollection } from "@/lib/db/models/TaskInvitation";
import { getLegalConsentsCollection } from "@/lib/db/models/LegalConsent";
import { getAnalyticsCollection } from "@/lib/analytics/events";

function isTransactionUnsupported(error: unknown): boolean {
  const code = (error as { code?: number }).code;
  const message = error instanceof Error ? error.message : String(error);
  return code === 20 || code === 263 || /transaction numbers are only allowed|replica set|mongos/i.test(message);
}

async function deleteAccountData(db: Db, userId: ObjectId, ownerId: string, email: string, session?: ClientSession) {
  const [users, tasks, notifications, sessions, deliveries, invitations, consents, analytics] = await Promise.all([
    getUsersCollection(db),
    getTasksCollection(db),
    getNotificationsCollection(db),
    getVoiceSessionsCollection(db),
    getReminderDeliveriesCollection(db),
    getTaskInvitationsCollection(db),
    getLegalConsentsCollection(db),
    getAnalyticsCollection(db),
  ]);
  const options = session ? { session } : undefined;

  await tasks.deleteMany({ createdBy: ownerId }, options);
  await notifications.deleteMany({ userId: ownerId }, options);
  await sessions.deleteMany({ userId: ownerId }, options);
  await deliveries.deleteMany({ userId: ownerId }, options);
  await invitations.deleteMany({ $or: [{ ownerId }, { recipientEmail: email.toLowerCase() }] }, options);
  await consents.deleteMany({ userId: ownerId }, options);
  await analytics.deleteMany({ userId: ownerId }, options);
  const deleted = await users.deleteOne({ _id: userId }, options);
  if (deleted.deletedCount === 0) throw new Error("ACCOUNT_NOT_FOUND");
}

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

  const userId = new ObjectId(auth.user.id);
  try {
    const client = await getMongoClient();
    const db = await connectWithRetry();
    const session = client.startSession();
    try {
      try {
        await session.withTransaction(async () => {
          await deleteAccountData(db, userId, auth.user.id, auth.user.email, session);
        });
      } catch (error) {
        if (!isTransactionUnsupported(error)) throw error;
        await deleteAccountData(db, userId, auth.user.id, auth.user.email);
      }
    } finally {
      await session.endSession();
    }

    await invalidateCache(`tasks:${auth.user.id}:*`);
    await invalidateCache(`ai-summary:${auth.user.id}:*`);
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
    if (error instanceof Error && error.message === "ACCOUNT_NOT_FOUND") {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }
    console.error("Account deletion error:", error);
    return NextResponse.json({ error: "Unable to delete account" }, { status: 503 });
  }
}
