import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { requireAuth } from "@/lib/auth/middleware";
import { connectWithRetry } from "@/lib/db/mongodb";
import { getTasksCollection } from "@/lib/db/models/Task";
import { getUsersCollection } from "@/lib/db/models/User";
import { taskUpdateSchema } from "@/lib/validators/task";
import { invalidateCache } from "@/lib/redis/ratelimit";
import type { Task } from "@/types/task";
import { normalizeTask } from "@/lib/tasks/normalize";
import { cancelTaskDeliveries } from "@/lib/reminders/cancelTaskDeliveries";
import { validateTaskDependencies } from "@/lib/tasks/dependencies";
import { trackEvent } from "@/lib/analytics/events";
import { buildCalendarComposeLink } from "@/lib/calendar/link";

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

  const { baseUpdatedAt, ...parsedUpdateFields } = parsed.data;
  const updateFields = { ...parsedUpdateFields } as typeof parsedUpdateFields & { delegationStatus?: "none" | "pending" };
  const unsetFields: Record<string, ""> = {};
  if (updateFields.delegatedTo === "") {
    delete updateFields.delegatedTo;
    unsetFields.delegatedTo = "";
  }
  if (updateFields.delegatedPhone === "") {
    delete updateFields.delegatedPhone;
    unsetFields.delegatedPhone = "";
  }
  if (updateFields.dueDate === "") {
    delete updateFields.dueDate;
    unsetFields.dueDate = "";
    unsetFields.calendarLink = "";
  }
  if (updateFields.reminderAt === "") {
    delete updateFields.reminderAt;
    unsetFields.reminderAt = "";
  }

  try {
    const db = await connectWithRetry();
    const tasks = await getTasksCollection(db);
    const existing = await tasks.findOne({ _id: new ObjectId(id), createdBy: auth.user.id }, { projection: { status: 1, priority: 1, title: 1, durationMinutes: 1, updatedAt: 1 } });
    if (!existing) return NextResponse.json({ error: "Task not found" }, { status: 404 });
    if (baseUpdatedAt && existing.updatedAt !== baseUpdatedAt) return NextResponse.json({ error: "Task changed elsewhere; review it before saving this edit", conflict: true }, { status: 409 });
    if (updateFields.dependencies) {
      const dependencyError = await validateTaskDependencies(tasks, auth.user.id, id, updateFields.dependencies);
      if (dependencyError) return NextResponse.json({ error: dependencyError }, { status: 400 });
    }
    if ((updateFields.dueDate || updateFields.reminderAt) && !updateFields.calendarLink && existing) updateFields.calendarLink = buildCalendarComposeLink(existing.title, updateFields.dueDate || updateFields.reminderAt, updateFields.durationMinutes ?? existing.durationMinutes);
    if (typeof updateFields.delegatedTo === "string" || typeof updateFields.delegatedPhone === "string") updateFields.delegationStatus = "pending";
    if (unsetFields.delegatedTo && unsetFields.delegatedPhone) updateFields.delegationStatus = "none";
    const result = await tasks.findOneAndUpdate(
      { _id: new ObjectId(id), createdBy: auth.user.id },
      {
        $set: { ...updateFields, updatedAt: new Date().toISOString() },
        ...(Object.keys(unsetFields).length > 0 ? { $unset: unsetFields } : {}),
      },
      { returnDocument: "after" }
    );

    if (!result) return NextResponse.json({ error: "Task not found" }, { status: 404 });
    const newlyCompleted = existing?.status !== "completed" && result.status === "completed";
    if (newlyCompleted) {
      await trackEvent(db, auth.user.id, "task_completed");
      const users = await getUsersCollection(db);
      await users.updateOne(
        { _id: new ObjectId(auth.user.id) },
        { $inc: { "behaviorProfile.completedTaskCount": 1, "behaviorProfile.highPriorityCompletedCount": existing?.priority === "high" || existing?.priority === "urgent" ? 1 : 0 }, $set: { "behaviorProfile.updatedAt": new Date().toISOString() } },
      );
    }
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
    await trackEvent(db, auth.user.id, "task_deleted");

    await invalidateCache(`tasks:${auth.user.id}:*`);
    await invalidateCache(`ai-summary:${auth.user.id}:*`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Task deletion error:", error);
    return NextResponse.json({ error: "Failed to delete task" }, { status: 503 });
  }
}
