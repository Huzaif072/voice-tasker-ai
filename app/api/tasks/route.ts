import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/middleware";
import { connectWithRetry } from "@/lib/db/mongodb";
import { getTasksCollection } from "@/lib/db/models/Task";
import { taskSchema } from "@/lib/validators/task";
import { getCached, setCache, invalidateCache } from "@/lib/redis/ratelimit";
import { rateLimit } from "@/lib/redis/ratelimit";
import type { Task } from "@/types/task";
import { normalizeTask } from "@/lib/tasks/normalize";
import { buildTaskFilter, taskCacheKey, taskQuerySchema } from "@/lib/tasks/query";

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const parsedQuery = taskQuerySchema.safeParse(Object.fromEntries(searchParams.entries()));
  if (!parsedQuery.success) {
    return NextResponse.json({ error: parsedQuery.error.issues[0]?.message ?? "Invalid task query" }, { status: 400 });
  }
  const query = parsedQuery.data;
  const cacheKey = taskCacheKey(auth.user.id, query);

  const cached = await getCached<{ tasks: Partial<Task>[]; page: number; limit: number; total: number; hasMore: boolean }>(cacheKey);
  if (cached) return NextResponse.json({ ...cached, tasks: cached.tasks.map(normalizeTask) });

  try {
    const db = await connectWithRetry();
    const tasks = await getTasksCollection(db);
    const filter = buildTaskFilter(auth.user.id, query);
    const skip = (query.page - 1) * query.limit;
    const [results, total] = await Promise.all([
      tasks.find(filter).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(query.limit).toArray(),
      tasks.countDocuments(filter),
    ]);
    const serialized = results.map((t) =>
      normalizeTask({ ...t, _id: t._id?.toString() } as Partial<Task>)
    );
    const response = {
      tasks: serialized,
      page: query.page,
      limit: query.limit,
      total,
      hasMore: skip + serialized.length < total,
    };

    await setCache(cacheKey, response);
    return NextResponse.json(response);
  } catch {
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const limited = await rateLimit(`tasks:create:${auth.user.id}`, 30, 60);
  if (!limited.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    const parsed = taskSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid task" }, { status: 400 });
    }

    const db = await connectWithRetry();
    const tasks = await getTasksCollection(db);
    const now = new Date().toISOString();

    const taskDoc = {
      ...parsed.data,
      dueDate: parsed.data.dueDate || undefined,
      contextTriggers: [] as Task["contextTriggers"],
      createdBy: auth.user.id,
      createdAt: now,
      updatedAt: now,
    };

    const result = await tasks.insertOne(taskDoc);
    await invalidateCache(`tasks:${auth.user.id}:*`);
    await invalidateCache(`ai-summary:${auth.user.id}:*`);

    return NextResponse.json(
      { task: normalizeTask({ ...taskDoc, _id: result.insertedId.toString() }) },
      { status: 201 }
    );
  } catch (error) {
    console.error("Task creation error:", error);
    return NextResponse.json({ error: "Failed to create task" }, { status: 503 });
  }
}
