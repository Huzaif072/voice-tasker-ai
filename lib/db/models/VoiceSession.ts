import type { Db, Collection, ObjectId } from "mongodb";
import type { VoiceSession } from "@/types/voice";

export type VoiceSessionDocument = Omit<VoiceSession, "_id" | "expiresAt"> & { _id?: ObjectId; expiresAt?: Date };
export const VOICE_SESSIONS_COLLECTION = "voice_sessions";
let indexesPromise: Promise<void> | null = null;

export async function getVoiceSessionsCollection(db: Db): Promise<Collection<VoiceSessionDocument>> {
  const col = db.collection<VoiceSessionDocument>(VOICE_SESSIONS_COLLECTION);
  if (!indexesPromise) {
    indexesPromise = Promise.all([
      col.createIndex({ userId: 1, timestamp: -1 }),
      col.createIndex({ userId: 1, conversationId: 1, timestamp: -1 }),
      col.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    ]).then(() => undefined).catch((error) => { indexesPromise = null; throw error; });
  }
  await indexesPromise;
  return col;
}
