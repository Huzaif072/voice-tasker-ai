import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { requireAuth } from "@/lib/auth/middleware";
import { connectWithRetry } from "@/lib/db/mongodb";
import { getTasksCollection } from "@/lib/db/models/Task";
import { taskUpdateSchema } from "@/lib/validators/task";
import { invalidateCache } from "@/lib/redis/ratelimit";
import type { Task } from "@/types/task";
import { normalizeTask } from "@/lib/tasks/normalize";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid task ID" }, { status: 400 });
  }

  const db = await connectWithRetry();
  const tasks = await getTasksCollection(db);
  const task = await tasks.findOne({ _id: new ObjectId(id), createdBy: auth.user.id });

  if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });
  return NextResponse.json({
    task: normalizeTask({ ...task, _id: task._id?.toString() } as Partial<Task>),
  });
}

export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid task ID" }, { status: 400 });
  }

  const body = await request.json();
  const parsed = taskUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const db = await connectWithRetry();
  const tasks = await getTasksCollection(db);
  const result = await tasks.findOneAndUpdate(
    { _id: new ObjectId(id), createdBy: auth.user.id },
    { $set: { ...parsed.data, updatedAt: new Date().toISOString() } },
    { returnDocument: "after" }
  );

  if (!result) return NextResponse.json({ error: "Task not found" }, { status: 404 });
  await invalidateCache(`tasks:${auth.user.id}:*`);
    await invalidateCache(`ai-summary:${auth.user.id}:*`);

  return NextResponse.json({
    task: normalizeTask({ ...result, _id: result._id?.toString() } as Partial<Task>),
  });
}

export async function DELETE(request: Request, { params }: Params) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid task ID" }, { status: 400 });
  }

  const db = await connectWithRetry();
  const tasks = await getTasksCollection(db);
  const result = await tasks.deleteOne({ _id: new ObjectId(id), createdBy: auth.user.id });

  if (result.deletedCount === 0) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  await invalidateCache(`tasks:${auth.user.id}:*`);
    await invalidateCache(`ai-summary:${auth.user.id}:*`);
  return NextResponse.json({ success: true });
}
