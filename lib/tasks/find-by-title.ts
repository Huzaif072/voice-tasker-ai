import type { Collection } from "mongodb";
import type { TaskDocument } from "@/lib/db/models/Task";

export async function findTasksByTitle(
  tasks: Collection<TaskDocument>,
  userId: string,
  title: string,
  limit = 5
): Promise<TaskDocument[]> {
  const cleaned = title.trim();
  if (!cleaned) return [];

  const exact = await tasks
    .find({ createdBy: userId, title: { $regex: new RegExp(`^${escapeRegex(cleaned)}$`, "i") }, status: { $ne: "cancelled" } })
    .limit(limit)
    .toArray();
  if (exact.length) return exact;

  const partial = await tasks
    .find({ createdBy: userId, title: { $regex: new RegExp(escapeRegex(cleaned), "i") }, status: { $ne: "cancelled" } })
    .limit(limit)
    .toArray();
  if (partial.length) return partial;

  const words = cleaned.split(/\s+/).filter((word) => word.length > 2);
  if (!words.length) return [];
  const pattern = words.map(escapeRegex).join(".*");
  return tasks
    .find({ createdBy: userId, title: { $regex: new RegExp(pattern, "i") }, status: { $ne: "cancelled" } })
    .limit(limit)
    .toArray();
}

export async function findTaskByTitle(
  tasks: Collection<TaskDocument>,
  userId: string,
  title: string
): Promise<TaskDocument | null> {
  return (await findTasksByTitle(tasks, userId, title, 1))[0] ?? null;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
