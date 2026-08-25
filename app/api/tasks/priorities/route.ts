import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/middleware";
import { connectWithRetry } from "@/lib/db/mongodb";
import { getTasksCollection } from "@/lib/db/models/Task";
import { normalizeTask } from "@/lib/tasks/normalize";
import { suggestPriority } from "@/lib/tasks/prioritize";

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  try {
    const db = await connectWithRetry();
    const tasks = await getTasksCollection(db);
    const rows = (await tasks.find({ createdBy: auth.user.id }).sort({ updatedAt: -1 }).limit(200).toArray()).map((task) => normalizeTask({ ...task, _id: task._id?.toString() }));
    const open = rows.filter((task) => task.status !== "completed" && task.status !== "cancelled");
    return NextResponse.json({ suggestions: open.map((task) => ({ taskId: task._id, title: task.title, currentPriority: task.priority, ...suggestPriority(task, rows) })).filter((item) => item.priority !== item.currentPriority) });
  } catch {
    return NextResponse.json({ error: "Priority suggestions unavailable" }, { status: 503 });
  }
}
