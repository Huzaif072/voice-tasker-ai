import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/middleware";
import { connectWithRetry } from "@/lib/db/mongodb";
import { getUsersCollection } from "@/lib/db/models/User";
import { getRedis } from "@/lib/redis/client";

export const dynamic = "force-dynamic";

export type ProviderStatus = "ok" | "configured" | "unconfigured" | "ready" | "incomplete" | "unavailable" | "disabled";
export type ProviderHealth = {
  mongodb: ProviderStatus;
  redis: ProviderStatus;
  groq: ProviderStatus;
  email: ProviderStatus;
  push: ProviderStatus;
  googleCalendar: ProviderStatus;
  twilio: ProviderStatus;
  sentry: ProviderStatus;
  socket: ProviderStatus;
};

const PROVIDER_CHECK_TIMEOUT_MS = 2_000;

function configured(value: string | undefined) {
  return Boolean(value?.trim());
}

async function withTimeout<T>(work: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      work,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error("provider check timed out")), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function checkSocket(): Promise<ProviderStatus> {
  const url = process.env.SOCKET_SERVER_URL?.trim().replace(/\/$/, "");
  if (!url) return "disabled";
  try {
    await withTimeout(fetch(`${url}/healthz`, { cache: "no-store" }).then((response) => { if (!response.ok) throw new Error("socket health failed"); }), PROVIDER_CHECK_TIMEOUT_MS);
    return "ok";
  } catch {
    return "unavailable";
  }
}

async function checkRedis(): Promise<ProviderStatus> {
  const redis = getRedis();
  if (!redis) return "unconfigured";
  try {
    await withTimeout(redis.ping(), PROVIDER_CHECK_TIMEOUT_MS);
    return "ok";
  } catch {
    return "unavailable";
  }
}

export function createProviderHealthResponse(providers: ProviderHealth) {
  return NextResponse.json(
    { providers, timestamp: new Date().toISOString() },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const [redis, database, socket] = await Promise.all([
    checkRedis(),
    withTimeout(connectWithRetry(1), PROVIDER_CHECK_TIMEOUT_MS)
      .then((db) => ({ db, status: "ok" as const }))
      .catch(() => ({ db: null, status: "unavailable" as const })),
    checkSocket(),
  ]);

  let calendarStatus: ProviderStatus;
  if (database.status === "unavailable") {
    calendarStatus = "unavailable";
  } else {
    const calendarEnabled = process.env.GOOGLE_CALENDAR_ENABLED === "true";
    const calendarConfigured = configured(process.env.GOOGLE_CLIENT_ID) && configured(process.env.GOOGLE_CLIENT_SECRET);
    const calendarConnected = await withTimeout(
      getUsersCollection(database.db).then((users) => users.findOne({ _id: new ObjectId(auth.user.id) }, { projection: { googleCalendarRefreshToken: 1 } })),
      PROVIDER_CHECK_TIMEOUT_MS,
    ).then((user) => Boolean(user?.googleCalendarRefreshToken)).catch(() => false);
    calendarStatus = !calendarEnabled ? "disabled" : calendarConfigured && calendarConnected ? "ready" : "incomplete";
  }

  const providers: ProviderHealth = {
    mongodb: database.status,
    redis,
    groq: configured(process.env.GROQ_API_KEY) ? "configured" : "unconfigured",
    email: configured(process.env.SMTP_HOST) && configured(process.env.SMTP_USER) && configured(process.env.SMTP_PASS) ? "configured" : "unconfigured",
    push: configured(process.env.VAPID_PUBLIC_KEY) && configured(process.env.VAPID_PRIVATE_KEY) && configured(process.env.VAPID_MAILTO) ? "configured" : "unconfigured",
    googleCalendar: calendarStatus,
    twilio: configured(process.env.TWILIO_ACCOUNT_SID) && configured(process.env.TWILIO_AUTH_TOKEN) && configured(process.env.TWILIO_FROM_NUMBER) ? "configured" : "unconfigured",
    sentry: configured(process.env.SENTRY_DSN) || configured(process.env.NEXT_PUBLIC_SENTRY_DSN) ? "configured" : "unconfigured",
    socket,
  };

  return createProviderHealthResponse(providers);
}
