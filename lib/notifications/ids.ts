import { ObjectId } from "mongodb";

export function parseNotificationId(value: unknown): ObjectId | null {
  return typeof value === "string" && ObjectId.isValid(value) ? new ObjectId(value) : null;
}
