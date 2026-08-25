import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { requireAuth } from "@/lib/auth/middleware";
import { connectWithRetry } from "@/lib/db/mongodb";
import { getTasksCollection } from "@/lib/db/models/Task";
import { getUsersCollection } from "@/lib/db/models/User";
import { createCalendarEvent } from "@/lib/calendar/google";
import { normalizeTask } from "@/lib/tasks/normalize";
import { calendarEventInputSchema } from "@/lib/validators/ai";

export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  if (process.env.GOOGLE_CALENDAR_ENABLED !== "true" || process.env.GOOGLE_CALENDAR_WRITE_ENABLED !== "true") return NextResponse.json({ error: "Google Calendar event creation is not enabled" }, { status: 409 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request body" }, { status: 400 }); }
  const parsed = calendarEventInputSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid task ID" }, { status: 400 });
  try {
    const db = await connectWithRetry();
    const tasks = await getTasksCollection(db);
    const users = await getUsersCollection(db);
    const task = await tasks.findOne({ _id: new ObjectId(parsed.data.taskId), createdBy: auth.user.id });
    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });
    const normalized = normalizeTask({ ...task, _id: task._id?.toString() });
    if (!normalized.dueDate) return NextResponse.json({ error: "A due date is required before creating a calendar event" }, { status: 400 });
    if (normalized.calendarEventUrl) return NextResponse.json({ eventId: normalized.calendarEventId, eventUrl: normalized.calendarEventUrl, existing: true });
    const user = await users.findOne({ _id: new ObjectId(auth.user.id) });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    const start = new Date(normalized.dueDate);
    const end = new Date(start.getTime() + (normalized.durationMinutes ?? 30) * 60_000);
    const created = await createCalendarEvent(user, users, { summary: normalized.title, description: normalized.description, start: start.toISOString(), end: end.toISOString() });
    if (!created) return NextResponse.json({ error: "Google Calendar is not linked or event creation failed" }, { status: 502 });
    await tasks.updateOne({ _id: task._id, createdBy: auth.user.id }, { $set: { calendarEventId: created.id, calendarEventUrl: created.url, updatedAt: new Date().toISOString() } });
    return NextResponse.json({ eventId: created.id, eventUrl: created.url });
  } catch {
    return NextResponse.json({ error: "Calendar event creation unavailable" }, { status: 503 });
  }
}
