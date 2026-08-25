import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { requireAuth } from "@/lib/auth/middleware";
import { connectWithRetry } from "@/lib/db/mongodb";
import { getTasksCollection } from "@/lib/db/models/Task";
import { getUsersCollection } from "@/lib/db/models/User";
import { createAssignmentStatusNotification } from "@/lib/tasks/assignments";
import { invalidateCache } from "@/lib/redis/ratelimit";
import { recordRealtimeEvent } from "@/lib/realtime/events";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };
const assignmentActionSchema = z.object({ action: z.enum(["accept", "decline"]) });

export async function POST(request: Request, { params }: Params) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: "Invalid task ID" }, { status: 400 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request body" }, { status: 400 }); }
  const parsed = assignmentActionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Action must be accept or decline" }, { status: 400 });

  try {
    const db = await connectWithRetry();
    const tasks = await getTasksCollection(db);
    const task = await tasks.findOne({ _id: new ObjectId(id), assigneeUserId: auth.user.id });
    if (!task) return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    if (task.assignmentStatus !== "pending") return NextResponse.json({ error: "Assignment has already been resolved", status: task.assignmentStatus }, { status: 409 });
    const status = parsed.data.action === "accept" ? "accepted" : "declined";
    await tasks.updateOne(
      { _id: task._id, assigneeUserId: auth.user.id, assignmentStatus: "pending" },
      { $set: { assignmentStatus: status, delegationStatus: status, updatedAt: new Date().toISOString() } },
    );
    const users = await getUsersCollection(db);
    const recipient = await users.findOne({ _id: new ObjectId(auth.user.id) }, { projection: { name: 1 } });
    await createAssignmentStatusNotification(db, task.createdBy, id, task.title, recipient?.name ?? "The assignee", status);
    await recordRealtimeEvent(db, auth.user.id, "assignment_changed", id);
    await recordRealtimeEvent(db, task.createdBy, "assignment_changed", id);
    await invalidateCache(`tasks:${auth.user.id}:*`);
    await invalidateCache(`tasks:${task.createdBy}:*`);
    return NextResponse.json({ success: true, assignmentStatus: status });
  } catch (error) {
    console.error("Assignment update error:", error);
    return NextResponse.json({ error: "Unable to update assignment" }, { status: 503 });
  }
}
