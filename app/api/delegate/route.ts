import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { requireAuth } from "@/lib/auth/middleware";
import { connectWithRetry } from "@/lib/db/mongodb";
import { getTasksCollection } from "@/lib/db/models/Task";
import { sendDelegationEmail } from "@/lib/notifications/email";
import { sendSms } from "@/lib/notifications/sms";
import { delegationSchema } from "@/lib/validators/delegation";
import { checkDelegationRateLimit, getRetryAfterSeconds } from "@/lib/auth/rate-limit";
import { createAssignmentNotification, findAssignableUser } from "@/lib/tasks/assignments";
import { recordRealtimeEvent } from "@/lib/realtime/events";
import { buildInvitationUrl, createTaskInvitation } from "@/lib/tasks/invitations";
import { getTaskInvitationsCollection } from "@/lib/db/models/TaskInvitation";
import { decryptTaskDocument, encryptedTaskUpdate } from "@/lib/privacy/taskEncryption";

export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = delegationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid delegation request" },
      { status: 400 }
    );
  }

  const { taskId, email, phone } = parsed.data;
  if (!ObjectId.isValid(taskId)) {
    return NextResponse.json({ error: "Invalid task ID" }, { status: 400 });
  }
  const limit = await checkDelegationRateLimit(auth.user.id, taskId, email ?? phone ?? "unknown");
  if (!limit.success) {
    return NextResponse.json(
      { error: "Too many delegation requests. Please try again later." },
      { status: 429, headers: { "Retry-After": String(getRetryAfterSeconds("delegation")) } },
    );
  }

  try {
    const db = await connectWithRetry();
    const tasks = await getTasksCollection(db);
    const taskFilter = { _id: new ObjectId(taskId), createdBy: auth.user.id };
    const storedTask = await tasks.findOne(taskFilter);

    if (!storedTask) return NextResponse.json({ error: "Task not found" }, { status: 404 });
    const task = decryptTaskDocument(storedTask);
    const recipient = await findAssignableUser(db, email);
    let invitationUrl: string | undefined;
    let invitationExpiresAt: Date | undefined;
    if (!recipient && (email || phone)) {
      const invitations = await getTaskInvitationsCollection(db);
      await invitations.updateMany({ taskId, ownerId: auth.user.id, status: "pending" }, { $set: { status: "revoked" } });
      const invitation = await createTaskInvitation(db, { taskId, ownerId: auth.user.id, recipientEmail: email?.toLowerCase(), recipientPhone: phone });
      invitationUrl = buildInvitationUrl(invitation.token);
      invitationExpiresAt = invitation.expiresAt;
    }

    const encryptedUpdate = encryptedTaskUpdate(task, { delegatedTo: email ?? task.delegatedTo, delegatedPhone: phone ?? task.delegatedPhone });
    const updated = await tasks.updateOne(
      taskFilter,
      {
        $set: {
          ...encryptedUpdate.$set,
          ...(recipient?._id ? { assigneeUserId: recipient._id.toString(), assignmentStatus: "pending" as const } : { assignmentStatus: invitationUrl ? "pending" as const : "none" as const }),
          delegationStatus: "pending",
          updatedAt: new Date().toISOString(),
        },
        $unset: { ...encryptedUpdate.$unset, ...(recipient?._id ? {} : { assigneeUserId: "" }) },
      }
    );
    if (updated.matchedCount === 0) {
      return NextResponse.json({ error: "Task could not be updated" }, { status: 409 });
    }
    await recordRealtimeEvent(db, auth.user.id, "task_updated", taskId);
    if (recipient?._id) {
      await createAssignmentNotification(db, recipient._id.toString(), taskId, task.title, auth.user.name);
      await recordRealtimeEvent(db, recipient._id.toString(), "assignment_changed", taskId);
    }

    const emailSent = email ? await sendDelegationEmail(email, task.title, auth.user.name, invitationUrl) : false;
    const smsResult = phone ? await sendSms(phone, `${auth.user.name} delegated a task to you: ${task.title}${invitationUrl ? ` Review it here: ${invitationUrl}` : ""}`) : { sent: false, configured: false, permanent: false };
    const delivered = emailSent || smsResult.sent;
    await tasks.updateOne(
      taskFilter,
      { $set: { delegationStatus: delivered ? "sent" : "failed", updatedAt: new Date().toISOString() } },
    );

    return NextResponse.json({
      success: true,
      pending: !delivered,
      channels: { email: emailSent, sms: smsResult.sent },
      assignment: recipient?._id ? { status: "pending", recipientUserId: recipient._id.toString() } : invitationUrl ? { status: "invited", invitationUrl, expiresAt: invitationExpiresAt?.toISOString() } : null,
      message: delivered ? "Delegation delivered" : "Task saved as a failed delegation for retry",
    });
  } catch (error) {
    console.error("Delegation error:", error);
    return NextResponse.json({ error: "Delegation failed" }, { status: 503 });
  }
}
