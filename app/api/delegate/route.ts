import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { requireAuth } from "@/lib/auth/middleware";
import { connectWithRetry } from "@/lib/db/mongodb";
import { getTasksCollection } from "@/lib/db/models/Task";
import { sendDelegationEmail } from "@/lib/notifications/email";
import { sendSms } from "@/lib/notifications/sms";
import { delegationSchema } from "@/lib/validators/delegation";
import { checkDelegationRateLimit, getRetryAfterSeconds } from "@/lib/auth/rate-limit";

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
    const task = await tasks.findOne(taskFilter);

    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

    const updated = await tasks.updateOne(
      taskFilter,
      {
        $set: {
          ...(email ? { delegatedTo: email } : {}),
          ...(phone ? { delegatedPhone: phone } : {}),
          delegationStatus: "pending",
          updatedAt: new Date().toISOString(),
        },
      }
    );
    if (updated.matchedCount === 0) {
      return NextResponse.json({ error: "Task could not be updated" }, { status: 409 });
    }

    const emailSent = email ? await sendDelegationEmail(email, task.title, auth.user.name) : false;
    const smsResult = phone ? await sendSms(phone, `${auth.user.name} delegated a task to you: ${task.title}`) : { sent: false, configured: false, permanent: false };
    const delivered = emailSent || smsResult.sent;
    await tasks.updateOne(
      taskFilter,
      { $set: { delegationStatus: delivered ? "sent" : "failed", updatedAt: new Date().toISOString() } },
    );

    return NextResponse.json({
      success: true,
      pending: !delivered,
      channels: { email: emailSent, sms: smsResult.sent },
      message: delivered ? "Delegation delivered" : "Task saved as a failed delegation for retry",
    });
  } catch (error) {
    console.error("Delegation error:", error);
    return NextResponse.json({ error: "Delegation failed" }, { status: 503 });
  }
}
