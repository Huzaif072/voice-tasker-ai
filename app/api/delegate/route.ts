import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { requireAuth } from "@/lib/auth/middleware";
import { connectWithRetry } from "@/lib/db/mongodb";
import { getTasksCollection } from "@/lib/db/models/Task";
import { sendDelegationEmail } from "@/lib/notifications/email";
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

  const { taskId, email } = parsed.data;
  if (!ObjectId.isValid(taskId)) {
    return NextResponse.json({ error: "Invalid task ID" }, { status: 400 });
  }
  const limit = await checkDelegationRateLimit(auth.user.id, taskId, email);
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
      { $set: { delegatedTo: email, updatedAt: new Date().toISOString() } }
    );
    if (updated.matchedCount === 0) {
      return NextResponse.json({ error: "Task could not be updated" }, { status: 409 });
    }

    const sent = await sendDelegationEmail(email, task.title, auth.user.name);

    return NextResponse.json({
      success: true,
      pending: !sent,
      message: sent ? "Delegation email sent" : "Task saved as pending delegation",
    });
  } catch (error) {
    console.error("Delegation error:", error);
    return NextResponse.json({ error: "Delegation failed" }, { status: 503 });
  }
}
