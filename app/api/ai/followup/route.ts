import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/middleware";
import { connectWithRetry } from "@/lib/db/mongodb";
import { getTasksCollection } from "@/lib/db/models/Task";
import { followupInputSchema } from "@/lib/validators/ai";

export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request body" }, { status: 400 }); }
  const parsed = followupInputSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid follow-up request" }, { status: 400 });
  if (!ObjectId.isValid(parsed.data.taskId)) return NextResponse.json({ error: "Invalid task ID" }, { status: 400 });

  try {
    const db = await connectWithRetry();
    const tasks = await getTasksCollection(db);
    const task = await tasks.findOne({ _id: new ObjectId(parsed.data.taskId), createdBy: auth.user.id });
    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });
    const prompts = [
      ...(task.subtasks?.length ? ["Which subtask should we tackle next?"] : ["Break this into smaller steps"]),
      ...(task.reminderAt ? ["Move or remove the reminder"] : ["Set a reminder for tomorrow"]),
      ...(task.dependencies?.length ? ["Show the tasks blocking this one"] : ["What priority should this have?"]),
      ...(task.delegatedTo || task.delegatedPhone ? ["Check the delegation status"] : ["Delegate to a teammate"]),
    ];
    return NextResponse.json({ taskId: parsed.data.taskId, question: task.status === "completed" ? "Would you like to review another task?" : `What should happen next with “${task.title}”?`, prompts: prompts.slice(0, 4) });
  } catch {
    return NextResponse.json({ error: "Follow-up unavailable" }, { status: 503 });
  }
}
