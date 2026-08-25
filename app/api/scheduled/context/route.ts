import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { connectWithRetry } from "@/lib/db/mongodb";
import { getTasksCollection } from "@/lib/db/models/Task";
import { evaluateContextTriggers } from "@/lib/context/evaluate";
import { captureException } from "@/lib/monitoring/capture";

const USER_BATCH_SIZE = 10;

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
    const userCursor = tasks.aggregate<{ _id: string }>([
      { $match: { "contextTriggers.0": { $exists: true }, status: { $nin: ["completed", "cancelled"] } } },
      { $group: { _id: "$createdBy" } },
      { $sort: { _id: 1 } },
    ]);
    let users = 0;
    let processedUsers = 0;
    let failedUsers = 0;
    let evaluated = 0;
    let matched = 0;
    let batch: string[] = [];

    async function processBatch(userIds: string[]) {
      const results = await Promise.allSettled(userIds.map((userId) => evaluateContextTriggers(db, userId)));
      for (const result of results) {
        if (result.status === "rejected") {
          failedUsers += 1;
          captureException(result.reason, { route: "/api/scheduled/context" });
          continue;
        }
        processedUsers += 1;
        evaluated += result.value.evaluated;
        matched += result.value.matched;
      }
    }

    for await (const row of userCursor) {
      users += 1;
      batch.push(row._id);
      if (batch.length >= USER_BATCH_SIZE) {
        await processBatch(batch);
        batch = [];
      }
    }
    if (batch.length > 0) await processBatch(batch);

    const durationMs = Date.now() - startedAt;
    console.info(JSON.stringify({ scope: "context_worker", event: "run_completed", users, processedUsers, failedUsers, evaluated, matched, durationMs, timestamp: new Date().toISOString() }));
    return NextResponse.json({ ok: true, users, processedUsers, failedUsers, evaluated, matched, durationMs });
  } catch (error) {
    captureException(error, { route: "/api/scheduled/context" });
    console.error(JSON.stringify({ scope: "context_worker", event: "run_failed", durationMs: Date.now() - startedAt, timestamp: new Date().toISOString() }));
    return NextResponse.json({ error: "Context processing failed" }, { status: 503 });
  }
}
