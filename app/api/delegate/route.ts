import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { requireAuth } from "@/lib/auth/middleware";
import { connectWithRetry } from "@/lib/db/mongodb";
import { getTasksCollection } from "@/lib/db/models/Task";
import { sendDelegationEmail } from "@/lib/notifications/email";

export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const { taskId, email } = await request.json();
  if (!taskId || !email) {
    return NextResponse.json({ error: "taskId and email required" }, { status: 400 });
  }

  if (!ObjectId.isValid(taskId)) {
    return NextResponse.json({ error: "Invalid task ID" }, { status: 400 });
  }

  const db = await connectWithRetry();
  const tasks = await getTasksCollection(db);
  const task = await tasks.findOne({ _id: new ObjectId(taskId), createdBy: auth.user.id });

  if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

  await tasks.updateOne(
    { _id: new ObjectId(taskId) },
    { $set: { delegatedTo: email, updatedAt: new Date().toISOString() } }
  );

  const sent = await sendDelegationEmail(email, task.title, auth.user.name);

  return NextResponse.json({
    success: true,
    pending: !sent,
    message: sent ? "Delegation email sent" : "Task saved as pending delegation",
  });
}
