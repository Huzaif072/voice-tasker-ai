import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/middleware";
import { connectWithRetry } from "@/lib/db/mongodb";
import { rateLimit } from "@/lib/redis/ratelimit";
import { voiceChunkSchema, voiceUploadInitSchema } from "@/lib/validators/voice";
import { appendVoiceChunk, createVoiceUpload, MAX_AUDIO_BYTES } from "@/lib/voice/uploads";

const MAX_CHUNK_BYTES = 256 * 1024;

export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const limited = await rateLimit(`voice-upload:${auth.user.id}`, 360, 60);
  if (!limited.success) return NextResponse.json({ error: "Voice upload rate limit exceeded" }, { status: 429 });
  try {
    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.includes("multipart/form-data")) return NextResponse.json({ error: "Use multipart form data" }, { status: 415 });
    const form = await request.formData();
    const file = form.get("chunk");
    if (!(file instanceof File)) return NextResponse.json({ error: "Audio chunk is required" }, { status: 400 });
    if (file.size > MAX_CHUNK_BYTES || file.size > MAX_AUDIO_BYTES) return NextResponse.json({ error: "Audio chunk is too large" }, { status: 413 });
    const rawUploadId = form.get("uploadId");
    const rawIndex = form.get("index");
    const rawMimeType = form.get("mimeType");
    const db = await connectWithRetry();
    if (!rawUploadId) {
      const init = voiceUploadInitSchema.safeParse({ mimeType: (typeof rawMimeType === "string" ? rawMimeType : file.type) || "audio/webm" });
      if (!init.success) return NextResponse.json({ error: init.error.issues[0]?.message ?? "Invalid audio type" }, { status: 400 });
      const uploadId = await createVoiceUpload(db, auth.user.id, init.data.mimeType);
      const result = await appendVoiceChunk(db, auth.user.id, uploadId, 0, Buffer.from(await file.arrayBuffer()));
      return NextResponse.json({ ...result, mimeType: init.data.mimeType }, { status: 201 });
    }
    const parsed = voiceChunkSchema.safeParse({ uploadId: rawUploadId, index: rawIndex });
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid audio chunk" }, { status: 400 });
    const result = await appendVoiceChunk(db, auth.user.id, parsed.data.uploadId, parsed.data.index, Buffer.from(await file.arrayBuffer()));
    return NextResponse.json(result);
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    const status = code === "AUDIO_TOO_LARGE" ? 413 : code === "UPLOAD_EXPIRED" ? 410 : code.startsWith("INVALID_") ? 400 : 503;
    return NextResponse.json({ error: status === 503 ? "Voice upload unavailable" : code.replaceAll("_", " ").toLowerCase() }, { status });
  }
}
