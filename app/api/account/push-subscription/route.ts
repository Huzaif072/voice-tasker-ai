import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { requireAuth } from "@/lib/auth/middleware";
import { connectWithRetry } from "@/lib/db/mongodb";
import { getUsersCollection } from "@/lib/db/models/User";
import { pushSubscriptionSchema } from "@/lib/validators/account";
import { encryptUserJson } from "@/lib/privacy/fieldEncryption";

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  if (!ObjectId.isValid(auth.user.id)) return NextResponse.json({ error: "Account not found" }, { status: 404 });

  try {
    const db = await connectWithRetry();
    const user = await (await getUsersCollection(db)).findOne(
      { _id: new ObjectId(auth.user.id) },
      { projection: { pushSubscription: 1, pushSubscriptionEncrypted: 1 } },
    );
    if (!user) return NextResponse.json({ error: "Account not found" }, { status: 404 });
    return NextResponse.json({ configured: Boolean(process.env.VAPID_PUBLIC_KEY), subscribed: Boolean(user.pushSubscriptionEncrypted ?? user.pushSubscription), publicKey: process.env.VAPID_PUBLIC_KEY ?? null });
  } catch (error) {
    console.error("Push subscription lookup error:", error);
    return NextResponse.json({ error: "Unable to load push notification status" }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  if (!ObjectId.isValid(auth.user.id)) return NextResponse.json({ error: "Account not found" }, { status: 404 });
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY || !process.env.VAPID_MAILTO) {
    return NextResponse.json({ error: "Push notifications are not configured" }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const parsed = pushSubscriptionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid push subscription" }, { status: 400 });

  try {
    const db = await connectWithRetry();
    const result = await (await getUsersCollection(db)).updateOne(
      { _id: new ObjectId(auth.user.id) },
      { $set: { pushSubscriptionEncrypted: encryptUserJson(parsed.data), pushSubscriptionUpdatedAt: new Date().toISOString() }, $unset: { pushSubscription: "" } },
    );
    if (!result.matchedCount) return NextResponse.json({ error: "Account not found" }, { status: 404 });
    return NextResponse.json({ subscribed: true });
  } catch (error) {
    console.error("Push subscription save error:", error);
    return NextResponse.json({ error: "Unable to save push subscription" }, { status: 503 });
  }
}

export async function DELETE(request: Request) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  if (!ObjectId.isValid(auth.user.id)) return NextResponse.json({ error: "Account not found" }, { status: 404 });

  try {
    const db = await connectWithRetry();
    const result = await (await getUsersCollection(db)).updateOne(
      { _id: new ObjectId(auth.user.id) },
      { $unset: { pushSubscription: "", pushSubscriptionEncrypted: "", pushSubscriptionUpdatedAt: "" } },
    );
    if (!result.matchedCount) return NextResponse.json({ error: "Account not found" }, { status: 404 });
    return NextResponse.json({ subscribed: false });
  } catch (error) {
    console.error("Push subscription delete error:", error);
    return NextResponse.json({ error: "Unable to remove push subscription" }, { status: 503 });
  }
}
