import type { Db, Collection, ObjectId } from "mongodb";
import type { User } from "@/types/user";

export type UserDocument = Omit<User, "_id"> & { _id?: ObjectId };

export const USERS_COLLECTION = "users";

export async function getUsersCollection(db: Db): Promise<Collection<UserDocument>> {
  const col = db.collection<UserDocument>(USERS_COLLECTION);
  await col.createIndex({ email: 1 }, { unique: true });
  await col.createIndex(
    { provider: 1, providerId: 1 },
    {
      unique: true,
      partialFilterExpression: { providerId: { $exists: true } },
    }
  );
  await col.createIndex(
    { "linkedProviders.provider": 1, "linkedProviders.providerId": 1 },
    {
      unique: true,
      partialFilterExpression: { "linkedProviders.providerId": { $exists: true } },
    }
  );
  return col;
}

export const defaultVoiceSettings = {
  language: "en-US",
  speed: 1,
  enabled: true,
};
