import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/middleware";
import { connectWithRetry } from "@/lib/db/mongodb";
import { getTasksCollection } from "@/lib/db/models/Task";
import { getTaskInvitationsCollection } from "@/lib/db/models/TaskInvitation";
import { createAssignmentStatusNotification } from "@/lib/tasks/assignments";
import { findTaskInvitation } from "@/lib/tasks/invitations";
import { recordRealtimeEvent } from "@/lib/realtime/events";
import { z } from "zod";

type Params = { params: Promise<{ token: string }> };
const actionSchema = z.object({ action: z.enum(["accept", "decline"]) });

function cleanToken(value: string) {
  return value.trim().replace(/[^A-Za-z0-9_-]/g, "");
}

export async function GET(_request: Request, { params }: Params) {
  const { token: rawToken } = await params;
  const token = cleanToken(rawToken);
  if (token.length < 40) return NextResponse.json({ error: "Invalid invitation" }, { status: 400 });
  try {
    const db = await connectWithRetry();
    const invitation = await findTaskInvitation(db, token);
    if (!invitation) return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
    return NextResponse.json({ status: invitation.status, expiresAt: invitation.expiresAt.toISOString(), recipientEmail: invitation.recipientEmail ?? null });
  } catch {
    return NextResponse.json({ error: "Invitation unavailable" }, { status: 503 });
  }
}

export async function POST(request: Request, { params }: Params) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const { token: rawToken } = await params;
  const token = cleanToken(rawToken);
  if (token.length < 40) return NextResponse.json({ error: "Invalid invitation" }, { status: 400 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request body" }, { status: 400 }); }
  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Action must be accept or decline" }, { status: 400 });

  try {
    const db = await connectWithRetry();
    const invitation = await findTaskInvitation(db, token);
    if (!invitation) return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
    if (invitation.status !== "pending") return NextResponse.json({ error: "Invitation is no longer active", status: invitation.status }, { status: 409 });
    if (invitation.recipientEmail && invitation.recipientEmail !== auth.user.email.toLowerCase()) return NextResponse.json({ error: "Sign in with the invited email address" }, { status: 403 });
    if (!ObjectId.isValid(invitation.taskId)) return NextResponse.json({ error: "Invitation task is invalid" }, { status: 409 });

    const status = parsed.data.action === "accept" ? "accepted" : "declined";
    const tasks = await getTasksCollection(db);
    const task = await tasks.findOne({ _id: new ObjectId(invitation.taskId), createdBy: invitation.ownerId });
    if (!task) return NextResponse.json({ error: "Task no longer exists" }, { status: 404 });
    if (task.assigneeUserId && task.assigneeUserId !== auth.user.id) return NextResponse.json({ error: "Task is already assigned" }, { status: 409 });
    await tasks.updateOne(
      { _id: task._id, createdBy: invitation.ownerId },
      { $set: { assigneeUserId: auth.user.id, assignmentStatus: status, delegationStatus: status, updatedAt: new Date().toISOString() } },
    );
    const invitations = await getTaskInvitationsCollection(db);
    await invitations.updateOne({ _id: invitation._id, status: "pending" }, { $set: { status, respondedAt: new Date().toISOString(), respondedBy: auth.user.id } });
    await createAssignmentStatusNotification(db, invitation.ownerId, invitation.taskId, task.title, auth.user.name, status);
    await recordRealtimeEvent(db, auth.user.id, "assignment_changed", invitation.taskId);
    await recordRealtimeEvent(db, invitation.ownerId, "assignment_changed", invitation.taskId);
    return NextResponse.json({ success: true, status });
  } catch (error) {
    console.error("Invitation response error:", error);
    return NextResponse.json({ error: "Unable to respond to invitation" }, { status: 503 });
  }
}
