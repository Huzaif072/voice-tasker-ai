import { NextResponse } from "next/server";
import { connectWithRetry } from "@/lib/db/mongodb";

export const dynamic = "force-dynamic";

export async function GET() {
  const startedAt = Date.now();
  try {
    const db = await connectWithRetry(1);
    await db.command({ ping: 1 });
    return NextResponse.json(
      {
        ok: true,
        service: "voicetasker",
        dependencies: { mongodb: "ok" },
        latencyMs: Date.now() - startedAt,
        timestamp: new Date().toISOString(),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      {
        ok: false,
        service: "voicetasker",
        dependencies: { mongodb: "unavailable" },
        timestamp: new Date().toISOString(),
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
