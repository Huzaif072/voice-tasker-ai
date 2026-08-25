import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/middleware";
import { connectWithRetry } from "@/lib/db/mongodb";
import { getAnalyticsCollection } from "@/lib/analytics/events";

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  try {
    const db = await connectWithRetry();
    const collection = await getAnalyticsCollection(db);
    const since = new Date();
    since.setDate(since.getDate() - 30);
    const rows = await collection.aggregate<{ _id: string; count: number }>([
      { $match: { userId: auth.user.id, createdAt: { $gte: since.toISOString() } } },
      { $group: { _id: "$name", count: { $sum: 1 } } },
    ]).toArray();
    const metrics = Object.fromEntries(rows.map((row) => [row._id, row.count]));
    return NextResponse.json({ periodDays: 30, metrics });
  } catch {
    return NextResponse.json({ error: "Analytics unavailable" }, { status: 503 });
  }
}
