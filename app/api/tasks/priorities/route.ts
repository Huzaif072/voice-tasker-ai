import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/middleware";
import { connectWithRetry } from "@/lib/db/mongodb";
import { getTasksCollection } from "@/lib/db/models/Task";
import { getUsersCollection } from "@/lib/db/models/User";
import { normalizeTask } from "@/lib/tasks/normalize";
import { suggestDeadline, suggestPriority } from "@/lib/tasks/prioritize";
import { buildBehaviorProfile } from "@/lib/tasks/behavior";

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  try {
    const db = await connectWithRetry();
    const tasks = await getTasksCollection(db);
    const users = await getUsersCollection(db);
    const [user, taskDocuments] = await Promise.all([
      ObjectId.isValid(auth.user.id) ? users.findOne({ _id: new ObjectId(auth.user.id) }, { projection: { behaviorProfile: 1 } }) : null,
      tasks.find({ createdBy: auth.user.id }).sort({ updatedAt: -1 }).limit(200).toArray(),
    ]);
    const rows = taskDocuments.map((task) => normalizeTask({ ...task, _id: task._id?.toString() }));
    const profile = buildBehaviorProfile(rows, user?.behaviorProfile);
    if (ObjectId.isValid(auth.user.id)) await users.updateOne({ _id: new ObjectId(auth.user.id) }, { $set: { behaviorProfile: profile } });
    const open = rows.filter((task) => task.status !== "completed" && task.status !== "cancelled");
    const suggestions = open.map((task) => ({ taskId: task._id, title: task.title, currentPriority: task.priority, ...suggestPriority(task, rows, new Date(), profile), deadlineSuggestion: suggestDeadline(task) })).filter((item) => item.priority !== item.currentPriority || item.deadlineSuggestion.dueDate);
    return NextResponse.json({ suggestions, behaviorProfile: profile });
  } catch {
    return NextResponse.json({ error: "Priority suggestions unavailable" }, { status: 503 });
  }
}
