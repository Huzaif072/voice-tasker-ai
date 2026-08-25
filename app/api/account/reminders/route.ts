import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { requireAuth } from "@/lib/auth/middleware";
import { connectWithRetry } from "@/lib/db/mongodb";
import { getUsersCollection, defaultReminderSettings } from "@/lib/db/models/User";
import { reminderSettingsSchema } from "@/lib/validators/account";

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  if (!ObjectId.isValid(auth.user.id)) return NextResponse.json({ error: "Account not found" }, { status: 404 });

  try {
    const db = await connectWithRetry();
    const user = await (await getUsersCollection(db)).findOne(
      { _id: new ObjectId(auth.user.id) },
      { projection: { reminderSettings: 1 } },
    );
    if (!user) return NextResponse.json({ error: "Account not found" }, { status: 404 });
    return NextResponse.json({ settings: user.reminderSettings ?? defaultReminderSettings });
  } catch (error) {
    console.error("Reminder settings lookup error:", error);
    return NextResponse.json({ error: "Unable to load reminder settings" }, { status: 503 });
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  if (!ObjectId.isValid(auth.user.id)) return NextResponse.json({ error: "Account not found" }, { status: 404 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const parsed = reminderSettingsSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid reminder settings" }, { status: 400 });

  try {
    const db = await connectWithRetry();
    const result = await (await getUsersCollection(db)).findOneAndUpdate(
      { _id: new ObjectId(auth.user.id) },
      { $set: { reminderSettings: parsed.data } },
      { returnDocument: "after", projection: { reminderSettings: 1 } },
    );
    if (!result) return NextResponse.json({ error: "Account not found" }, { status: 404 });
    return NextResponse.json({ settings: result.reminderSettings ?? parsed.data });
  } catch (error) {
    console.error("Reminder settings update error:", error);
    return NextResponse.json({ error: "Unable to update reminder settings" }, { status: 503 });
  }
}
