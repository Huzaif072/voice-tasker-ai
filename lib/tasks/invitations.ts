import { createHash, randomBytes } from "node:crypto";
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
  const invitations = await getTaskInvitationsCollection(db);
  await invitations.insertOne({ ...input, tokenHash: hashToken(token), status: "pending", createdAt, expiresAt });
  return { token, expiresAt };
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

export function buildInvitationUrl(token: string) {
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return `${baseUrl}/invite/${encodeURIComponent(token)}`;
}
