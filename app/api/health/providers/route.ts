import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/middleware";
import { connectWithRetry } from "@/lib/db/mongodb";
import { getUsersCollection } from "@/lib/db/models/User";
import { getRedis } from "@/lib/redis/client";

export const dynamic = "force-dynamic";

function configured(value: string | undefined) {
  return Boolean(value?.trim());
}

async function checkRedis() {
  const redis = getRedis();
  if (!redis) return { status: "unconfigured" as const };
  try {
    await redis.ping();
    return { status: "ok" as const };
  } catch {
    return { status: "unavailable" as const };
  }
}

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const db = await connectWithRetry(1);
    const [redis, user] = await Promise.all([
      checkRedis(),
      getUsersCollection(db).then((users) => users.findOne({ _id: new ObjectId(auth.user.id) }, { projection: { googleCalendarRefreshToken: 1 } })),
    ]);
    const calendarEnabled = process.env.GOOGLE_CALENDAR_ENABLED === "true";
    const calendarConfigured = configured(process.env.GOOGLE_CLIENT_ID) && configured(process.env.GOOGLE_CLIENT_SECRET);
    const calendarConnected = Boolean(user?.googleCalendarRefreshToken);
    const calendarStatus = !calendarEnabled ? "disabled" : calendarConfigured && calendarConnected ? "ready" : "incomplete";

    return NextResponse.json(
      {
        providers: {
          mongodb: "ok",
          redis: redis.status,
          groq: configured(process.env.GROQ_API_KEY) ? "configured" : "unconfigured",
          email: configured(process.env.SMTP_HOST) && configured(process.env.SMTP_USER) && configured(process.env.SMTP_PASS) ? "configured" : "unconfigured",
          push: configured(process.env.VAPID_PUBLIC_KEY) && configured(process.env.VAPID_PRIVATE_KEY) ? "configured" : "unconfigured",
          googleCalendar: calendarStatus,
          twilio: configured(process.env.TWILIO_ACCOUNT_SID) && configured(process.env.TWILIO_AUTH_TOKEN) && configured(process.env.TWILIO_FROM_NUMBER) ? "configured" : "unconfigured",
          sentry: configured(process.env.SENTRY_DSN) || configured(process.env.NEXT_PUBLIC_SENTRY_DSN) ? "configured" : "unconfigured",
        },
        timestamp: new Date().toISOString(),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json({ error: "Provider health unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
