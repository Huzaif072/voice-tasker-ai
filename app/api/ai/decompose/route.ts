import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/middleware";
import { decomposeTask } from "@/lib/groq/task-decomposer";

export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const { title, description } = await request.json();
  if (!title) return NextResponse.json({ error: "Title required" }, { status: 400 });

  const subtasks = await decomposeTask(title, description);
  return NextResponse.json({ subtasks });
}
