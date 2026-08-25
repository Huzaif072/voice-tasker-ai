import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { requireAuth } from "@/lib/auth/middleware";
import { connectWithRetry } from "@/lib/db/mongodb";
import { getTasksCollection } from "@/lib/db/models/Task";
import { getGroqClient, GROQ_MODEL } from "@/lib/groq/client";
import { normalizeDueDate } from "@/lib/groq/intent-parser";
import { suggestDeadline } from "@/lib/tasks/prioritize";
import { normalizeTask } from "@/lib/tasks/normalize";
import { deadlineInputSchema } from "@/lib/validators/ai";
import { withTimeout } from "@/lib/utils/withTimeout";

export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request body" }, { status: 400 }); }
  const parsed = deadlineInputSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid task ID" }, { status: 400 });
  try {
    const db = await connectWithRetry();
    const tasks = await getTasksCollection(db);
    const task = await tasks.findOne({ _id: new ObjectId(parsed.data.taskId), createdBy: auth.user.id });
    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });
    const normalized = normalizeTask({ ...task, _id: task._id?.toString() });
    if (normalized.dueDate) return NextResponse.json({ dueDate: normalized.dueDate, reason: "Task already has a deadline", existing: true });
    try {
      const client = getGroqClient();
      const completion = await withTimeout(client.chat.completions.create({ model: GROQ_MODEL, messages: [{ role: "system", content: 'Suggest one realistic ISO8601 UTC deadline for the task. Return only JSON: {"dueDate":"ISO8601","reason":"short reason"}. Do not invent a date in the past.' }, { role: "user", content: JSON.stringify({ title: normalized.title, description: normalized.description, priority: normalized.priority, durationMinutes: normalized.durationMinutes }) }], response_format: { type: "json_object" }, temperature: 0.2 }), 15_000, "Deadline suggestion timed out");
      const content = completion.choices[0]?.message?.content;
      if (content) {
        const result = JSON.parse(content) as { dueDate?: unknown; reason?: unknown };
        const dueDate = normalizeDueDate(typeof result.dueDate === "string" ? result.dueDate : undefined);
        if (dueDate && new Date(dueDate).getTime() > Date.now()) return NextResponse.json({ dueDate, reason: typeof result.reason === "string" ? result.reason.slice(0, 200) : "Suggested by the task assistant" });
      }
    } catch {
      // Use the deterministic fallback when the optional AI provider is unavailable.
    }
    return NextResponse.json({ ...suggestDeadline(normalized), source: "fallback" });
  } catch {
    return NextResponse.json({ error: "Deadline suggestion unavailable" }, { status: 503 });
  }
}
