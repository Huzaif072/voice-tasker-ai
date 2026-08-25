import type { Db, Collection, ObjectId } from "mongodb";
import type { ReminderChannel, User } from "@/types/user";

export type UserDocument = Omit<User, "_id"> & { _id?: ObjectId };

export const USERS_COLLECTION = "users";
let indexesPromise: Promise<void> | null = null;

export async function getUsersCollection(db: Db): Promise<Collection<UserDocument>> {
  const col = db.collection<UserDocument>(USERS_COLLECTION);
  if (!indexesPromise) {
    indexesPromise = Promise.all([
      col.createIndex({ email: 1 }, { unique: true }),
      col.createIndex({ provider: 1, providerId: 1 }, { unique: true, partialFilterExpression: { providerId: { $exists: true } } }),
      col.createIndex({ "linkedProviders.provider": 1, "linkedProviders.providerId": 1 }, { unique: true, partialFilterExpression: { "linkedProviders.providerId": { $exists: true } } }),
    ]).then(() => undefined).catch((error) => { indexesPromise = null; throw error; });
  }
  await indexesPromise;
  return col;
}

export const defaultVoiceSettings = { language: "en-US", speed: 1, enabled: true };
export const defaultReminderSettings: { enabled: boolean; channels: ReminderChannel[] } = { enabled: true, channels: ["in_app"] };
