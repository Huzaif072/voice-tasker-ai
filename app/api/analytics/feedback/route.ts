import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/middleware";
import { connectWithRetry } from "@/lib/db/mongodb";
import { rateLimit } from "@/lib/redis/ratelimit";
import { trackEvent } from "@/lib/analytics/events";
import { feedbackInputSchema } from "@/lib/validators/ai";

export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const limited = await rateLimit(`analytics-feedback:${auth.user.id}`, 20, 60 * 60);
  if (!limited.success) return NextResponse.json({ error: "Feedback rate limit exceeded" }, { status: 429 });
  try {
    const body = await request.json();
    const parsed = feedbackInputSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid feedback" }, { status: 400 });
    const db = await connectWithRetry();
    await trackEvent(db, auth.user.id, "feedback_submitted", { category: parsed.data.category, rating: parsed.data.rating, conversationId: parsed.data.conversationId });
    return NextResponse.json({ recorded: true });
  } catch {
    return NextResponse.json({ error: "Feedback unavailable" }, { status: 503 });
  }
}
