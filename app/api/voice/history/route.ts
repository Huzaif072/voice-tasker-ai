import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/middleware";
import { connectWithRetry } from "@/lib/db/mongodb";
import { getVoiceSessionsCollection } from "@/lib/db/models/VoiceSession";

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  try {
    const db = await connectWithRetry();
    const sessions = await getVoiceSessionsCollection(db);
    const rows = await sessions.find({ userId: auth.user.id }).sort({ timestamp: -1 }).limit(25).toArray();
    return NextResponse.json({ sessions: rows.map((row) => ({ ...row, _id: row._id?.toString() })) });
  } catch (error) {
    console.error("Voice history error:", error);
    return NextResponse.json({ error: "Unable to load voice history" }, { status: 500 });
  }
}
