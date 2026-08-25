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
import { createAssignmentNotification, findAssignableUser } from "@/lib/tasks/assignments";
import { recordRealtimeEvent } from "@/lib/realtime/events";
import { getTaskInvitationsCollection } from "@/lib/db/models/TaskInvitation";
import { decryptTaskDocument, encryptedTaskUpdate, stripEncryptedTaskFields } from "@/lib/privacy/taskEncryption";

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
    const task = await tasks.findOne({ _id: new ObjectId(id), $or: [{ createdBy: auth.user.id }, { assigneeUserId: auth.user.id }] });
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
  const contentUpdates = { ...parsedUpdateFields } as Partial<Task>;
  const updateFields = { ...parsedUpdateFields } as typeof parsedUpdateFields & { delegationStatus?: "none" | "pending" };
  const unsetFields: Record<string, ""> = {};
  if (updateFields.delegatedTo === "") {
    delete updateFields.delegatedTo;
    contentUpdates.delegatedTo = undefined;
    unsetFields.delegatedTo = "";
  }
  if (updateFields.delegatedPhone === "") {
    delete updateFields.delegatedPhone;
    contentUpdates.delegatedPhone = undefined;
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
    const storedExisting = await tasks.findOne({ _id: new ObjectId(id), $or: [{ createdBy: auth.user.id }, { assigneeUserId: auth.user.id }] }, { projection: { status: 1, priority: 1, title: 1, durationMinutes: 1, updatedAt: 1, createdBy: 1, assigneeUserId: 1, contentEncrypted: 1, description: 1, calendarQuery: 1, subtasks: 1, contextTriggers: 1, tags: 1, delegatedTo: 1, delegatedPhone: 1 } });
    if (!storedExisting) return NextResponse.json({ error: "Task not found" }, { status: 404 });
    const existing = decryptTaskDocument(storedExisting) as typeof storedExisting & Partial<Task>;
    const isOwner = existing.createdBy === auth.user.id;
    const recipientEditableFields = new Set(["status", "subtasks", "baseUpdatedAt"]);
    if (!isOwner && Object.keys(parsed.data).some((field) => !recipientEditableFields.has(field))) return NextResponse.json({ error: "Only the task owner can edit this task" }, { status: 403 });
    if (baseUpdatedAt && existing.updatedAt !== baseUpdatedAt) return NextResponse.json({ error: "Task changed elsewhere; review it before saving this edit", conflict: true }, { status: 409 });
    if (updateFields.dependencies) {
      const dependencyError = await validateTaskDependencies(tasks, auth.user.id, id, updateFields.dependencies);
      if (dependencyError) return NextResponse.json({ error: dependencyError }, { status: 400 });
    }
    if ((updateFields.dueDate || updateFields.reminderAt) && !updateFields.calendarLink && existing) updateFields.calendarLink = buildCalendarComposeLink(existing.title, updateFields.dueDate || updateFields.reminderAt, updateFields.durationMinutes ?? existing.durationMinutes);
    const recipient = isOwner && updateFields.delegatedTo ? await findAssignableUser(db, updateFields.delegatedTo) : null;
    if (isOwner && (typeof updateFields.delegatedTo === "string" || typeof updateFields.delegatedPhone === "string")) {
      updateFields.delegationStatus = "pending";
      if (recipient?._id) {
        (updateFields as typeof updateFields & { assigneeUserId?: string; assignmentStatus?: "pending" }).assigneeUserId = recipient._id.toString();
        (updateFields as typeof updateFields & { assignmentStatus?: "pending" }).assignmentStatus = "pending";
      } else {
        (updateFields as typeof updateFields & { assignmentStatus?: "none" }).assignmentStatus = "none";
        unsetFields.assigneeUserId = "";
      }
    }
    if (unsetFields.delegatedTo && unsetFields.delegatedPhone) updateFields.delegationStatus = "none";
    const encryptedUpdate = encryptedTaskUpdate(existing, contentUpdates);
    const result = await tasks.findOneAndUpdate(
      { _id: new ObjectId(id), $or: [{ createdBy: auth.user.id }, { assigneeUserId: auth.user.id }] },
      {
        $set: { ...stripEncryptedTaskFields(updateFields), ...encryptedUpdate.$set, updatedAt: new Date().toISOString() },
        $unset: { ...unsetFields, ...encryptedUpdate.$unset },
      },
      { returnDocument: "after" }
    );

    if (!result) return NextResponse.json({ error: "Task not found" }, { status: 404 });
    if (recipient?._id && isOwner) {
      await createAssignmentNotification(db, recipient._id.toString(), id, existing.title, auth.user.name);
      await recordRealtimeEvent(db, recipient._id.toString(), "assignment_changed", id);
    }
    await recordRealtimeEvent(db, existing.createdBy, "task_updated", id);
    if (existing.assigneeUserId) await recordRealtimeEvent(db, existing.assigneeUserId, "task_updated", id);
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
      await cancelTaskDeliveries(db, id, existing.createdBy);
    }
    await invalidateCache(`tasks:${auth.user.id}:*`);
    if (existing.createdBy !== auth.user.id) await invalidateCache(`tasks:${existing.createdBy}:*`);
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
    await (await getTaskInvitationsCollection(db)).updateMany({ taskId: id, ownerId: auth.user.id, status: "pending" }, { $set: { status: "revoked" } });
    await recordRealtimeEvent(db, auth.user.id, "task_deleted", id);
    await trackEvent(db, auth.user.id, "task_deleted");

    await invalidateCache(`tasks:${auth.user.id}:*`);
    await invalidateCache(`ai-summary:${auth.user.id}:*`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Task deletion error:", error);
    return NextResponse.json({ error: "Failed to delete task" }, { status: 503 });
  }
}
