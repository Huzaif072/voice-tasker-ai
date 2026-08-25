import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/middleware";
import { signRealtimeToken } from "@/lib/auth/jwt";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  return NextResponse.json(
    { token: signRealtimeToken(auth.user), expiresInSeconds: 3600 },
    { headers: { "Cache-Control": "no-store" } },
  );
}
