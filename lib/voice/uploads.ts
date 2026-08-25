import { randomUUID } from "node:crypto";
import type { Db } from "mongodb";
import { getVoiceChunksCollection, getVoiceUploadsCollection } from "@/lib/db/models/VoiceUpload";

export const MAX_AUDIO_BYTES = 8 * 1024 * 1024;
export const MAX_AUDIO_CHUNKS = 240;
export const VOICE_UPLOAD_TTL_MS = 15 * 60 * 1000;

const uploadIdPattern = /^[a-f0-9-]{20,80}$/i;

export function createVoiceUploadId() {
  return randomUUID();
}

export function validUploadId(uploadId: string) {
  return uploadIdPattern.test(uploadId);
}

export async function createVoiceUpload(db: Db, userId: string, mimeType: string) {
  const now = new Date();
  const uploadId = createVoiceUploadId();
  await (await getVoiceUploadsCollection(db)).insertOne({
    uploadId,
    userId,
    mimeType,
    chunkCount: 0,
    totalBytes: 0,
    createdAt: now,
    updatedAt: now,
    expiresAt: new Date(now.getTime() + VOICE_UPLOAD_TTL_MS),
  });
  return uploadId;
}

export async function appendVoiceChunk(db: Db, userId: string, uploadId: string, index: number, data: Buffer) {
  if (!validUploadId(uploadId)) throw new Error("INVALID_UPLOAD");
  if (!Number.isInteger(index) || index < 0 || index >= MAX_AUDIO_CHUNKS) throw new Error("INVALID_CHUNK_INDEX");
  if (!data.length || data.length > MAX_AUDIO_BYTES) throw new Error("INVALID_CHUNK_SIZE");
  const uploads = await getVoiceUploadsCollection(db);
  const chunks = await getVoiceChunksCollection(db);
  const upload = await uploads.findOne({ uploadId, userId });
  if (!upload || upload.expiresAt.getTime() <= Date.now()) throw new Error("UPLOAD_EXPIRED");
  const existing = await chunks.findOne({ uploadId, userId, index });
  const nextBytes = upload.totalBytes - (existing?.bytes ?? 0) + data.length;
  if (nextBytes > MAX_AUDIO_BYTES) throw new Error("AUDIO_TOO_LARGE");
  const now = new Date();
  await chunks.updateOne(
    { uploadId, userId, index },
    { $set: { uploadId, userId, index, data, bytes: data.length, expiresAt: upload.expiresAt } },
    { upsert: true },
  );
  const chunkCount = Math.max(upload.chunkCount, index + 1);
  await uploads.updateOne({ uploadId, userId }, { $set: { chunkCount, totalBytes: nextBytes, updatedAt: now } });
  return { uploadId, index, chunkCount, totalBytes: nextBytes };
}

export async function assembleVoiceUpload(db: Db, userId: string, uploadId: string) {
  if (!validUploadId(uploadId)) throw new Error("INVALID_UPLOAD");
  const uploads = await getVoiceUploadsCollection(db);
  const chunks = await getVoiceChunksCollection(db);
  const upload = await uploads.findOne({ uploadId, userId });
  if (!upload || upload.expiresAt.getTime() <= Date.now()) throw new Error("UPLOAD_EXPIRED");
  if (upload.totalBytes < 1000 || upload.chunkCount < 1) throw new Error("UPLOAD_INCOMPLETE");
  const rows = await chunks.find({ uploadId, userId }).sort({ index: 1 }).toArray();
  if (rows.length !== upload.chunkCount || rows.some((row, index) => row.index !== index)) throw new Error("UPLOAD_INCOMPLETE");
  const audio = Buffer.concat(rows.map((row) => row.data), upload.totalBytes);
  if (audio.length !== upload.totalBytes || audio.length > MAX_AUDIO_BYTES) throw new Error("AUDIO_TOO_LARGE");
  await Promise.all([
    chunks.deleteMany({ uploadId, userId }),
    uploads.deleteOne({ uploadId, userId }),
  ]);
  return { audio, mimeType: upload.mimeType };
}

export async function discardVoiceUpload(db: Db, userId: string, uploadId: string) {
  if (!validUploadId(uploadId)) return;
  await Promise.all([
    (await getVoiceChunksCollection(db)).deleteMany({ uploadId, userId }),
    (await getVoiceUploadsCollection(db)).deleteOne({ uploadId, userId }),
  ]);
}
