import { createHmac } from "node:crypto";
import type { Task } from "@/types/task";
import type { TaskDocument } from "@/lib/db/models/Task";
import type { ObjectId } from "mongodb";
import { decryptUserJson, encryptUserJson } from "@/lib/privacy/fieldEncryption";

/**
 * User-authored task content is stored in one authenticated encrypted envelope.
 * Structural fields remain queryable for ownership, status, scheduling, and
 * assignment indexes. Existing pre-encryption fields are read as a fallback.
 */
export type EncryptedTaskContent = {
  title: string;
  description?: string;
  calendarQuery?: string;
  subtasks?: Task["subtasks"];
  contextTriggers?: Task["contextTriggers"];
  tags?: string[];
  delegatedTo?: string;
  delegatedPhone?: string;
};

type TaskStorageLike = Omit<Partial<Task>, "_id"> & { _id?: string | ObjectId; contentEncrypted?: string };

export function taskSearchTokens(task: Partial<Task>) {
  const text = [task.title, task.description, task.calendarQuery, ...(task.tags ?? []), ...(task.subtasks ?? []).map((item) => item.title)].filter(Boolean).join(" ").toLowerCase();
  const secret = process.env.FIELD_ENCRYPTION_KEY ?? process.env.JWT_SECRET ?? (process.env.NODE_ENV === "production" ? undefined : "dev-field-encryption-key-change-in-production");
  if (!secret || secret.length < 32) throw new Error("FIELD_ENCRYPTION_KEY or JWT_SECRET is not configured securely");
  return [...new Set(text.split(/[^\p{L}\p{N}]+/u).filter((token) => token.length >= 2).map((token) => createHmac("sha256", secret).update(token).digest("hex")))];
}

export const ENCRYPTED_TASK_FIELDS = [
  "title",
  "description",
  "calendarQuery",
  "subtasks",
  "contextTriggers",
  "tags",
  "delegatedTo",
  "delegatedPhone",
] as const;

function hasOwn(value: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

export function taskContentFromPublic(task: Partial<Task>): EncryptedTaskContent {
  return {
    title: typeof task.title === "string" ? task.title : "Untitled task",
    ...(typeof task.description === "string" ? { description: task.description } : {}),
    ...(typeof task.calendarQuery === "string" ? { calendarQuery: task.calendarQuery } : {}),
    ...(Array.isArray(task.subtasks) ? { subtasks: task.subtasks } : {}),
    ...(Array.isArray(task.contextTriggers) ? { contextTriggers: task.contextTriggers } : {}),
    ...(Array.isArray(task.tags) ? { tags: task.tags } : {}),
    ...(typeof task.delegatedTo === "string" ? { delegatedTo: task.delegatedTo } : {}),
    ...(typeof task.delegatedPhone === "string" ? { delegatedPhone: task.delegatedPhone } : {}),
  };
}

export function encryptTaskDocument(task: Partial<Task>) {
  const stored: Record<string, unknown> = { ...task };
  for (const field of ENCRYPTED_TASK_FIELDS) delete stored[field];
  stored.contentEncrypted = encryptUserJson(taskContentFromPublic(task));
  stored.searchTokens = taskSearchTokens(task);
  return stored;
}

export function decryptTaskDocument<T extends TaskStorageLike>(task: T): T {
  const encrypted = decryptUserJson<Partial<EncryptedTaskContent>>(task.contentEncrypted);
  if (!encrypted) return task;
  const result: Record<string, unknown> = { ...task };
  for (const field of ENCRYPTED_TASK_FIELDS) {
    if (!hasOwn(result, field) && hasOwn(encrypted, field)) result[field] = encrypted[field];
  }
  if (typeof encrypted.title === "string") result.title = encrypted.title;
  for (const field of ENCRYPTED_TASK_FIELDS) delete result[`${field}Encrypted`];
  return result as T;
}

export function encryptedTaskUpdate(existing: TaskStorageLike, updates: Partial<Task>) {
  const next = { ...existing, ...updates };
  const $set: Record<string, unknown> = { contentEncrypted: encryptUserJson(taskContentFromPublic(next as Partial<Task>)), searchTokens: taskSearchTokens(next as Partial<Task>) };
  const $unset: Record<string, ""> = {};
  for (const field of ENCRYPTED_TASK_FIELDS) $unset[field] = "";
  return { $set, $unset };
}

export function stripEncryptedTaskFields(value: Record<string, unknown>) {
  const copy = { ...value };
  for (const field of ENCRYPTED_TASK_FIELDS) delete copy[field];
  return copy;
}

export function publicTask<T extends TaskStorageLike>(task: T): Partial<Task> {
  return decryptTaskDocument(task) as unknown as Partial<Task>;
}

export function taskMatchesSearch(task: TaskStorageLike, search: string) {
  const query = search.trim().toLowerCase();
  if (!query) return true;
  const haystack = [task.title, task.description, task.calendarQuery, ...(task.tags ?? []), ...(task.subtasks ?? []).map((item) => item.title)].filter(Boolean).join(" ").toLowerCase();
  return query.split(/\s+/).every((word) => haystack.includes(word));
}

export type StoredTaskDocument = Omit<TaskDocument, typeof ENCRYPTED_TASK_FIELDS[number]> & Partial<Pick<TaskDocument, typeof ENCRYPTED_TASK_FIELDS[number]>> & { contentEncrypted?: string };
