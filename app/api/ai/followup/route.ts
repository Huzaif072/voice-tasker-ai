import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/middleware";

export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const { taskId } = await request.json();
  const prompts = [
    "Break this into smaller steps",
    "Set a reminder for tomorrow",
    "What's the priority?",
    "Delegate to a teammate",
  ];

  return NextResponse.json({ taskId, prompts });
}
