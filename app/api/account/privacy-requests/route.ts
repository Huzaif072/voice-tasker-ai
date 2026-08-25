import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/middleware";
import { connectWithRetry } from "@/lib/db/mongodb";
import { getPrivacyRequestsCollection, type PrivacyRequestType } from "@/lib/db/models/PrivacyRequest";
import { decryptUserText, encryptUserText } from "@/lib/privacy/fieldEncryption";
import { rateLimit } from "@/lib/redis/ratelimit";
import { z } from "zod";

const requestSchema = z.object({
  type: z.enum(["access", "erasure", "rectification", "restriction", "objection"]),
  details: z.string().trim().max(2000).optional(),
});

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const db = await connectWithRetry();
  const rows = await (await getPrivacyRequestsCollection(db)).find({ userId: auth.user.id }).sort({ createdAt: -1 }).limit(50).toArray();
  return NextResponse.json({ requests: rows.map(({ _id, details, expiresAt, ...row }) => ({ ...row, id: _id?.toString(), ...(details ? { details: decryptUserText(details) } : {}), expiresAt: expiresAt.toISOString() })) });
}

export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const limited = await rateLimit(`privacy-request:${auth.user.id}`, 10, 86_400);
  if (!limited.success) return NextResponse.json({ error: "Please wait before submitting another privacy request" }, { status: 429 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request body" }, { status: 400 }); }
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid privacy request" }, { status: 400 });
  const now = new Date().toISOString();
  const db = await connectWithRetry();
  const result = await (await getPrivacyRequestsCollection(db)).insertOne({
    userId: new ObjectId(auth.user.id).toString(),
    type: parsed.data.type as PrivacyRequestType,
    status: "received",
    ...(parsed.data.details ? { details: encryptUserText(parsed.data.details) } : {}),
    createdAt: now,
    updatedAt: now,
    expiresAt: new Date(Date.now() + 730 * 24 * 60 * 60 * 1000),
  });
  return NextResponse.json({ success: true, requestId: result.insertedId.toString(), type: parsed.data.type, status: "received", receivedAt: now }, { status: 201 });
}
