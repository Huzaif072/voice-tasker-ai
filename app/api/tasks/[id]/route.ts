import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { requireAuth } from "@/lib/auth/middleware";
import { connectWithRetry } from "@/lib/db/mongodb";
import { getTasksCollection } from "@/lib/db/models/Task";
import { taskUpdateSchema } from "@/lib/validators/task";
import { invalidateCache } from "@/lib/redis/ratelimit";
import type { Task } from "@/types/task";
import { normalizeTask } from "@/lib/tasks/normalize";
import { cancelTaskDeliveries } from "@/lib/reminders/cancelTaskDeliveries";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid task ID" }, { status: 400 });
  }

  try {
    const db = await connectWithRetry();
    const tasks = await getTasksCollection(db);
    const task = await tasks.findOne({ _id: new ObjectId(id), createdBy: auth.user.id });
    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });
    return NextResponse.json({
      task: normalizeTask({ ...task, _id: task._id?.toString() } as Partial<Task>),
    });
  } catch (error) {
    console.error("Task lookup error:", error);
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }
}

export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid task ID" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const parsed = taskUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid task update" }, { status: 400 });
  }

  const updateFields = { ...parsed.data };
  const unsetFields: Record<string, ""> = {};
  if (updateFields.delegatedTo === "") {
    delete updateFields.delegatedTo;
    unsetFields.delegatedTo = "";
  }
  if (updateFields.dueDate === "") {
    delete updateFields.dueDate;
    unsetFields.dueDate = "";
  }
  if (updateFields.reminderAt === "") {
    delete updateFields.reminderAt;
    unsetFields.reminderAt = "";
  }

  try {
    const db = await connectWithRetry();
    const tasks = await getTasksCollection(db);
    const result = await tasks.findOneAndUpdate(
      { _id: new ObjectId(id), createdBy: auth.user.id },
      {
        $set: { ...updateFields, updatedAt: new Date().toISOString() },
        ...(Object.keys(unsetFields).length > 0 ? { $unset: unsetFields } : {}),
      },
      { returnDocument: "after" }
    );

    if (!result) return NextResponse.json({ error: "Task not found" }, { status: 404 });
    if (result.status === "completed" || result.status === "cancelled") {
      await cancelTaskDeliveries(db, id, auth.user.id);
    }
    await invalidateCache(`tasks:${auth.user.id}:*`);
    await invalidateCache(`ai-summary:${auth.user.id}:*`);

    return NextResponse.json({
      task: normalizeTask({ ...result, _id: result._id?.toString() } as Partial<Task>),
    });
  } catch (error) {
    console.error("Task update error:", error);
    return NextResponse.json({ error: "Failed to update task" }, { status: 503 });
  }
}

export async function DELETE(request: Request, { params }: Params) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid task ID" }, { status: 400 });
  }

  try {
    const db = await connectWithRetry();
    const tasks = await getTasksCollection(db);
    const result = await tasks.deleteOne({ _id: new ObjectId(id), createdBy: auth.user.id });
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }
    await cancelTaskDeliveries(db, id, auth.user.id);

    await invalidateCache(`tasks:${auth.user.id}:*`);
    await invalidateCache(`ai-summary:${auth.user.id}:*`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Task deletion error:", error);
    return NextResponse.json({ error: "Failed to delete task" }, { status: 503 });
  }
}
