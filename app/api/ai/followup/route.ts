import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/middleware";
import { followupInputSchema } from "@/lib/validators/ai";

export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = followupInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid follow-up request" }, { status: 400 });
  }

  const prompts = [
    "Break this into smaller steps",
    "Set a reminder for tomorrow",
    "What's the priority?",
    "Delegate to a teammate",
  ];

  return NextResponse.json({ taskId: parsed.data.taskId, prompts });
}
