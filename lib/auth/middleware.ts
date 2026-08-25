import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { connectWithRetry } from "@/lib/db/mongodb";
import { getUsersCollection } from "@/lib/db/models/User";
import { getTokenFromRequest, verifyToken } from "./jwt";
import type { AuthUser } from "@/types/user";
import { isSessionVersionCurrent } from "./session";

export async function requireAuth(
  request: Request
): Promise<{ user: AuthUser } | NextResponse> {
  const token = getTokenFromRequest(request);
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = verifyToken(token);
  if (!payload || !ObjectId.isValid(payload.sub)) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
  }

  try {
    const db = await connectWithRetry();
    const users = await getUsersCollection(db);
    const user = await users.findOne({ _id: new ObjectId(payload.sub) });
    if (!user || user.disabledAt) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!isSessionVersionCurrent(payload.sv, user.sessionVersion)) {
      return NextResponse.json({ error: "Session expired" }, { status: 401 });
    }
    if (user.password && user.emailVerificationTokenHash) {
      return NextResponse.json({ error: "Email verification required" }, { status: 403 });
    }

    return {
      user: {
        id: user._id!.toString(),
        email: user.email,
        name: user.name,
        sessionVersion: user.sessionVersion ?? 0,
        emailVerifiedAt: user.emailVerifiedAt,
      },
    };
  } catch (error) {
    console.error("Authentication lookup error:", error);
    return NextResponse.json({ error: "Unable to verify the session" }, { status: 503 });
  }
}
