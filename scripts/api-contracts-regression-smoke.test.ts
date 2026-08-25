import { NextResponse } from "next/server";
import { requireAuth } from "../lib/auth/middleware.ts";
import { decomposeInputSchema, followupInputSchema } from "../lib/validators/ai.ts";

async function main() {
  const unauthenticated = await requireAuth(new Request("http://localhost/api/tasks"));
  if (!(unauthenticated instanceof NextResponse) || unauthenticated.status !== 401) {
    throw new Error("Authenticated routes must reject requests without a session");
  }

  const invalidToken = await requireAuth(new Request("http://localhost/api/tasks", {
    headers: { Authorization: "Bearer not-a-jwt" },
  }));
  if (!(invalidToken instanceof NextResponse) || invalidToken.status !== 401) {
    throw new Error("Authenticated routes must reject malformed bearer tokens");
  }

  if (decomposeInputSchema.safeParse({ title: "   " }).success) {
    throw new Error("AI decomposition must reject whitespace-only titles");
  }
  if (decomposeInputSchema.safeParse({ title: "x".repeat(501) }).success) {
    throw new Error("AI decomposition must enforce the title length bound");
  }
  if (followupInputSchema.safeParse({ taskId: "" }).success) {
    throw new Error("AI follow-up must reject an empty task ID");
  }

  console.log("PASS: authenticated route guards and AI request contracts reject invalid requests safely.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
