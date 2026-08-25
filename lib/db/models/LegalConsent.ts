import type { Collection, Db, ObjectId } from "mongodb";

export interface LegalConsentDocument {
  _id?: ObjectId;
  userId: string;
  privacyPolicyVersion: string;
  termsVersion: string;
  acceptedAt: string;
  source: "signup" | "account" | "oauth";
}

let indexesPromise: Promise<void> | null = null;

export async function getLegalConsentsCollection(db: Db): Promise<Collection<LegalConsentDocument>> {
  const collection = db.collection<LegalConsentDocument>("legal_consents");
  if (!indexesPromise) {
    indexesPromise = Promise.all([
      collection.createIndex({ userId: 1, acceptedAt: -1 }),
      collection.createIndex({ acceptedAt: 1 }),
    ]).then(() => undefined).catch((error) => { indexesPromise = null; throw error; });
  }
  await indexesPromise;
  return collection;
}
