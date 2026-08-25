import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth/middleware";
import { connectWithRetry } from "@/lib/db/mongodb";
import { rateLimit } from "@/lib/redis/ratelimit";
import { evaluateContextTriggers } from "@/lib/context/evaluate";
import { captureException } from "@/lib/monitoring/capture";

const locationSchema = z.object({
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180),
});

export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const limit = await rateLimit(`context:location:${auth.user.id}`, 30, 60);
  if (!limit.success) return NextResponse.json({ error: "Too many location updates" }, { status: 429 });
  try {
    const parsed = locationSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid location" }, { status: 400 });
    const db = await connectWithRetry();
    const result = await evaluateContextTriggers(db, auth.user.id, parsed.data);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    captureException(error, { route: "/api/context/location" });
    console.error("Context location evaluation error:", error);
    return NextResponse.json({ error: "Context evaluation unavailable" }, { status: 503 });
  }
}
