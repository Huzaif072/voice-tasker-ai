import type { Db, Collection, ObjectId } from "mongodb";
import type { VoiceSession } from "@/types/voice";

export type VoiceSessionDocument = Omit<VoiceSession, "_id"> & { _id?: ObjectId };

export const VOICE_SESSIONS_COLLECTION = "voice_sessions";

export async function getVoiceSessionsCollection(
  db: Db
): Promise<Collection<VoiceSessionDocument>> {
  const col = db.collection<VoiceSessionDocument>(VOICE_SESSIONS_COLLECTION);
  await col.createIndex({ userId: 1, timestamp: -1 });
  return col;
}
