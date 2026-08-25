import type { Db } from "mongodb";
import { getReminderDeliveriesCollection } from "@/lib/db/models/ReminderDelivery";

const DELIVERY_RETENTION_MS = 90 * 24 * 60 * 60 * 1000;

export async function cancelTaskDeliveries(db: Db, taskId: string, userId: string, now = new Date()): Promise<number> {
  const deliveries = await getReminderDeliveriesCollection(db);
  const result = await deliveries.updateMany(
    { taskId, userId, status: { $in: ["pending", "sending"] } },
    {
      $set: {
        status: "cancelled",
        lastError: "Task is no longer active",
        updatedAt: now.toISOString(),
        expiresAt: new Date(now.getTime() + DELIVERY_RETENTION_MS),
      },
      $unset: { leaseUntil: "" },
    },
  );
  return result.modifiedCount;
}
