import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/middleware";
import { connectWithRetry } from "@/lib/db/mongodb";
import { getTasksCollection } from "@/lib/db/models/Task";
import { taskSchema } from "@/lib/validators/task";
import { getCached, setCache, invalidateCache } from "@/lib/redis/ratelimit";
import { rateLimit } from "@/lib/redis/ratelimit";
import type { Task } from "@/types/task";

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const cacheKey = `tasks:${auth.user.id}:${status ?? "all"}`;

  const cached = await getCached<Task[]>(cacheKey);
  if (cached) return NextResponse.json({ tasks: cached });

  try {
    const db = await connectWithRetry();
    const tasks = await getTasksCollection(db);
    const filter: Record<string, unknown> = { createdBy: auth.user.id };
    if (status) filter.status = status;

    const results = await tasks.find(filter).sort({ createdAt: -1 }).limit(100).toArray();
    const serialized = results.map((t) => ({
      ...t,
      _id: t._id?.toString(),
    })) as Task[];

    await setCache(cacheKey, serialized);
    return NextResponse.json({ tasks: serialized });
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
    const body = await request.json();
    const parsed = taskSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
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
      { task: { ...taskDoc, _id: result.insertedId.toString() } },
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
  }
}
