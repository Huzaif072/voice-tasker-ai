import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import type { Db } from "mongodb";
import { getTaskInvitationsCollection, type TaskInvitationDocument } from "@/lib/db/models/TaskInvitation";

const INVITATION_TTL_DAYS = 7;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createTaskInvitation(db: Db, input: Omit<TaskInvitationDocument, "_id" | "tokenHash" | "status" | "createdAt" | "expiresAt">) {
  const token = randomBytes(32).toString("base64url");
  const createdAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000);
  const phoneVerificationCode = input.recipientPhone ? String(randomInt(100000, 1_000_000)) : undefined;
  const invitations = await getTaskInvitationsCollection(db);
  await invitations.insertOne({ ...input, tokenHash: hashToken(token), status: "pending", createdAt, expiresAt, ...(phoneVerificationCode ? { phoneVerificationCodeHash: hashToken(phoneVerificationCode), phoneVerificationExpiresAt: new Date(Date.now() + 15 * 60 * 1000), phoneVerificationAttempts: 0 } : {}) });
  return { token, expiresAt, phoneVerificationCode };
}

export async function findTaskInvitation(db: Db, token: string) {
  const invitations = await getTaskInvitationsCollection(db);
  const invitation = await invitations.findOne({ tokenHash: hashToken(token) });
  if (!invitation) return null;
  if (invitation.status === "pending" && invitation.expiresAt.getTime() <= Date.now()) {
    await invitations.updateOne({ _id: invitation._id, status: "pending" }, { $set: { status: "expired" } });
    return { ...invitation, status: "expired" as const };
  }
  return invitation;
}

export async function verifyPhoneInvitationCode(db: Db, invitation: TaskInvitationDocument, code: string) {
  if (!invitation.recipientPhone || !invitation.phoneVerificationCodeHash || !invitation.phoneVerificationExpiresAt || invitation.phoneVerificationExpiresAt.getTime() <= Date.now()) return false;
  if ((invitation.phoneVerificationAttempts ?? 0) >= 5) return false;
  const expected = Buffer.from(invitation.phoneVerificationCodeHash, "hex");
  const actual = Buffer.from(hashToken(code), "hex");
  const matches = expected.length === actual.length && timingSafeEqual(expected, actual);
  const invitations = await getTaskInvitationsCollection(db);
  if (matches) await invitations.updateOne({ _id: invitation._id, status: "pending" }, { $set: { phoneVerifiedAt: new Date().toISOString() } });
  else await invitations.updateOne({ _id: invitation._id, status: "pending" }, { $inc: { phoneVerificationAttempts: 1 } });
  return matches;
}

export function buildInvitationUrl(token: string) {
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return `${baseUrl}/invite/${encodeURIComponent(token)}`;
}
