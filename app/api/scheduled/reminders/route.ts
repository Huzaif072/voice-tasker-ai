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
  if (!hasValidSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = await connectWithRetry();
    const result = await processDueReminders(db);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("Reminder worker error:", error);
    return NextResponse.json({ error: "Reminder processing failed" }, { status: 503 });
  }
}
