import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { connectWithRetry } from "@/lib/db/mongodb";
import { getTasksCollection } from "@/lib/db/models/Task";
import { evaluateContextTriggers } from "@/lib/context/evaluate";
import { captureException } from "@/lib/monitoring/capture";

function hasValidSecret(request: Request) {
  const expected = process.env.REMINDER_WORKER_SECRET;
  const authorization = request.headers.get("authorization") ?? "";
  const supplied = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!expected || expected.length !== supplied.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(supplied));
}

export async function POST(request: Request) {
  if (!hasValidSecret(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const startedAt = Date.now();
  try {
    const db = await connectWithRetry();
    const tasks = await getTasksCollection(db);
    const userIds = await tasks.distinct("createdBy", { "contextTriggers.0": { $exists: true }, status: { $nin: ["completed", "cancelled"] } }) as string[];
    let evaluated = 0;
    let matched = 0;
    for (const userId of userIds.slice(0, 500)) {
      const result = await evaluateContextTriggers(db, userId);
      evaluated += result.evaluated;
      matched += result.matched;
    }
    const durationMs = Date.now() - startedAt;
    console.info(JSON.stringify({ scope: "context_worker", event: "run_completed", users: userIds.length, evaluated, matched, durationMs, timestamp: new Date().toISOString() }));
    return NextResponse.json({ ok: true, users: userIds.length, evaluated, matched, durationMs });
  } catch (error) {
    captureException(error, { route: "/api/scheduled/context" });
    console.error(JSON.stringify({ scope: "context_worker", event: "run_failed", durationMs: Date.now() - startedAt, timestamp: new Date().toISOString() }));
    return NextResponse.json({ error: "Context processing failed" }, { status: 503 });
  }
}
