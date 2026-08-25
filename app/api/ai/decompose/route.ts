import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/middleware";
import { decomposeTask } from "@/lib/groq/task-decomposer";
import { decomposeInputSchema } from "@/lib/validators/ai";

export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = decomposeInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid decomposition request" }, { status: 400 });
  }

  try {
    const subtasks = await decomposeTask(parsed.data.title, parsed.data.description);
    return NextResponse.json({ subtasks });
  } catch (error) {
    console.error("Task decomposition error:", error);
    return NextResponse.json({ error: "Task decomposition unavailable" }, { status: 502 });
  }
}
