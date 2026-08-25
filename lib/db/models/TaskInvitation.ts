import type { Collection, Db, ObjectId } from "mongodb";

export type TaskInvitationStatus = "pending" | "accepted" | "declined" | "revoked" | "expired";
export interface TaskInvitationDocument {
  _id?: ObjectId;
  tokenHash: string;
  taskId: string;
  ownerId: string;
  recipientEmail?: string;
  recipientPhone?: string;
  status: TaskInvitationStatus;
  createdAt: string;
  expiresAt: Date;
  respondedAt?: string;
  respondedBy?: string;
  phoneVerificationCodeHash?: string;
  phoneVerificationExpiresAt?: Date;
  phoneVerificationAttempts?: number;
  phoneVerifiedAt?: string;
}

const COLLECTION = "task_invitations";
let indexesPromise: Promise<void> | null = null;

export async function getTaskInvitationsCollection(db: Db): Promise<Collection<TaskInvitationDocument>> {
  const collection = db.collection<TaskInvitationDocument>(COLLECTION);
  if (!indexesPromise) {
    indexesPromise = Promise.all([
      collection.createIndex({ tokenHash: 1 }, { unique: true }),
      collection.createIndex({ taskId: 1, status: 1 }),
      collection.createIndex({ recipientEmail: 1, status: 1 }),
      collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    ]).then(() => undefined).catch((error) => { indexesPromise = null; throw error; });
  }
  await indexesPromise;
  return collection;
}
