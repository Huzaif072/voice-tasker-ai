import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/middleware";
import { connectWithRetry } from "@/lib/db/mongodb";
import { getUsersCollection } from "@/lib/db/models/User";
import { auditAuthEvent } from "@/lib/auth/audit";

export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const db = await connectWithRetry();
    const users = await getUsersCollection(db);
    await users.updateOne({ _id: new ObjectId(auth.user.id) }, { $inc: { sessionVersion: 1 } });
    auditAuthEvent("session_revoked", { userId: auth.user.id, scope: "all_devices" });
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
    console.error("Revoke-sessions error:", error);
    return NextResponse.json({ error: "Unable to revoke sessions" }, { status: 503 });
  }
}
