import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { getTokenFromRequest, verifyToken } from "@/lib/auth/jwt";
import { connectWithRetry } from "@/lib/db/mongodb";
import { getUsersCollection } from "@/lib/db/models/User";
import { isSessionVersionCurrent } from "@/lib/auth/session";
import { trackEvent } from "@/lib/analytics/events";

export async function GET(request: Request) {
  const token = getTokenFromRequest(request);
  if (!token) return NextResponse.json({ user: null });

  const payload = verifyToken(token);
  if (!payload || !ObjectId.isValid(payload.sub)) return NextResponse.json({ user: null });

  try {
    const db = await connectWithRetry();
    const users = await getUsersCollection(db);
    const user = await users.findOne(
      { _id: new ObjectId(payload.sub) },
      {
        projection: {
          email: 1,
          name: 1,
          disabledAt: 1,
          sessionVersion: 1,
          password: 1,
          emailVerificationTokenHash: 1,
          emailVerifiedAt: 1,
        },
      }
    );
    if (!user || user.disabledAt) return NextResponse.json({ user: null });
    if (!isSessionVersionCurrent(payload.sv, user.sessionVersion)) {
      return NextResponse.json({ user: null });
    }
    if (user.password && user.emailVerificationTokenHash) {
      return NextResponse.json({ user: null });
    }

    await trackEvent(db, user._id!.toString(), "app_active", { source: "session_check" });
    return NextResponse.json({
      user: {
        id: user._id!.toString(),
        email: user.email,
        name: user.name,
        sessionVersion: user.sessionVersion ?? 0,
        emailVerifiedAt: user.emailVerifiedAt,
      },
    });
  } catch (error) {
    console.error("Session hydration error:", error);
    return NextResponse.json({ error: "Unable to verify the session" }, { status: 503 });
  }
}
