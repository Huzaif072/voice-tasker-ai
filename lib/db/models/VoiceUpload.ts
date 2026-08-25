import type { Collection, Db, ObjectId } from "mongodb";

export interface VoiceUploadDocument {
  _id?: ObjectId;
  uploadId: string;
  userId: string;
  mimeType: string;
  chunkCount: number;
  totalBytes: number;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface VoiceChunkDocument {
  _id?: ObjectId;
  uploadId: string;
  userId: string;
  index: number;
  data: Buffer;
  bytes: number;
  expiresAt: Date;
}

let uploadIndexesPromise: Promise<void> | null = null;
let chunkIndexesPromise: Promise<void> | null = null;

export async function getVoiceUploadsCollection(db: Db): Promise<Collection<VoiceUploadDocument>> {
  const collection = db.collection<VoiceUploadDocument>("voice_uploads");
  if (!uploadIndexesPromise) {
    uploadIndexesPromise = Promise.all([
      collection.createIndex({ uploadId: 1, userId: 1 }, { unique: true }),
      collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    ]).then(() => undefined).catch((error) => { uploadIndexesPromise = null; throw error; });
  }
  await uploadIndexesPromise;
  return collection;
}

export async function getVoiceChunksCollection(db: Db): Promise<Collection<VoiceChunkDocument>> {
  const collection = db.collection<VoiceChunkDocument>("voice_chunks");
  if (!chunkIndexesPromise) {
    chunkIndexesPromise = Promise.all([
      collection.createIndex({ uploadId: 1, userId: 1, index: 1 }, { unique: true }),
      collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    ]).then(() => undefined).catch((error) => { chunkIndexesPromise = null; throw error; });
  }
  await chunkIndexesPromise;
  return collection;
}
