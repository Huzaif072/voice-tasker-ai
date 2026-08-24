import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/middleware";
import { connectWithRetry } from "@/lib/db/mongodb";
import { getTasksCollection } from "@/lib/db/models/Task";
import { generateSummary } from "@/lib/groq/summarizer";

export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const { period = "daily" } = await request.json();

  try {
    const db = await connectWithRetry();
    const tasks = await getTasksCollection(db);
    const userTasks = (await tasks.find({ createdBy: auth.user.id }).limit(50).toArray()).map(
      (t) => ({ ...t, _id: t._id?.toString() })
    );

    const summary = await generateSummary(userTasks, period);
    return NextResponse.json({ summary, period });
  } catch {
    return NextResponse.json({ error: "Summary generation failed" }, { status: 500 });
  }
}
