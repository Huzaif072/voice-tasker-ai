import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/middleware";
import { connectWithRetry } from "@/lib/db/mongodb";
import { getRealtimeEventsCollection } from "@/lib/db/models/RealtimeEvent";

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const since = new URL(request.url).searchParams.get("since") ?? new Date(Date.now() - 60_000).toISOString();
  if (!Number.isFinite(Date.parse(since))) return NextResponse.json({ error: "Invalid since timestamp" }, { status: 400 });
  try {
    const db = await connectWithRetry();
    const events = await getRealtimeEventsCollection(db);
    const rows = await events.find({ userId: auth.user.id, createdAt: { $gt: since } }).sort({ createdAt: 1 }).limit(100).toArray();
    return NextResponse.json({ events: rows.map((event) => ({ id: event._id?.toString(), name: event.name, taskId: event.taskId, createdAt: event.createdAt })) });
  } catch {
    return NextResponse.json({ error: "Realtime events unavailable" }, { status: 503 });
  }
}
