import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { connectWithRetry } from "@/lib/db/mongodb";
import { processDueReminders } from "@/lib/reminders/processDueReminders";

function hasValidSecret(request: Request): boolean {
  const expected = process.env.REMINDER_WORKER_SECRET;
  if (!expected) return false;
  const authorization = request.headers.get("authorization") ?? "";
  const supplied = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  const expectedBuffer = Buffer.from(expected);
  const suppliedBuffer = Buffer.from(supplied);
  return expectedBuffer.length === suppliedBuffer.length && crypto.timingSafeEqual(expectedBuffer, suppliedBuffer);
}

export async function POST(request: Request) {
  const startedAt = Date.now();
  if (!hasValidSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = await connectWithRetry();
    const result = await processDueReminders(db);
    const durationMs = Date.now() - startedAt;
    console.info(JSON.stringify({ scope: "reminder_worker", event: "run_completed", ...result, durationMs, timestamp: new Date().toISOString() }));
    return NextResponse.json({ ok: true, ...result, durationMs });
  } catch {
    console.error(JSON.stringify({ scope: "reminder_worker", event: "run_failed", durationMs: Date.now() - startedAt, timestamp: new Date().toISOString() }));
    return NextResponse.json({ error: "Reminder processing failed" }, { status: 503 });
  }
}
