import type { Collection, Db, ObjectId } from "mongodb";

export type PrivacyRequestType = "access" | "erasure" | "rectification" | "restriction" | "objection";
export type PrivacyRequestStatus = "received" | "processing" | "completed" | "rejected";

export interface PrivacyRequestDocument {
  _id?: ObjectId;
  userId: string;
  type: PrivacyRequestType;
  status: PrivacyRequestStatus;
  details?: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: Date;
}

let indexesPromise: Promise<void> | null = null;

export async function getPrivacyRequestsCollection(db: Db): Promise<Collection<PrivacyRequestDocument>> {
  const collection = db.collection<PrivacyRequestDocument>("privacy_requests");
  if (!indexesPromise) {
    indexesPromise = Promise.all([
      collection.createIndex({ userId: 1, createdAt: -1 }),
      collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    ]).then(() => undefined).catch((error) => { indexesPromise = null; throw error; });
  }
  await indexesPromise;
  return collection;
}
