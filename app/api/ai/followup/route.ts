import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/middleware";
import { connectWithRetry } from "@/lib/db/mongodb";
import { getTasksCollection } from "@/lib/db/models/Task";
import { followupInputSchema } from "@/lib/validators/ai";
import { generateFollowUps } from "@/lib/groq/followup";
import { withTimeout } from "@/lib/utils/withTimeout";
import { normalizeTask } from "@/lib/tasks/normalize";

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
    const normalizedTask = normalizeTask({ ...task, _id: task._id.toString() });
    const prompts = await withTimeout(generateFollowUps(normalizedTask), 8_000, "Follow-up generation timed out").catch(() => ["Break this into smaller steps", "Set a reminder for tomorrow", "Change its priority", "Delegate to a teammate"]);
    return NextResponse.json({ taskId: parsed.data.taskId, question: task.status === "completed" ? "Would you like to review another task?" : `What should happen next with “${task.title}”?`, prompts });
  } catch {
    return NextResponse.json({ error: "Follow-up unavailable" }, { status: 503 });
  }
}
