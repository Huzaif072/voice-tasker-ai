import type { Collection } from "mongodb";
import type { TaskDocument } from "@/lib/db/models/Task";

export async function findTaskByTitle(
  tasks: Collection<TaskDocument>,
  userId: string,
  title: string
): Promise<TaskDocument | null> {
  const cleaned = title.trim();
  if (!cleaned) return null;

  const exact = await tasks.findOne({
    createdBy: userId,
    title: { $regex: new RegExp(`^${escapeRegex(cleaned)}$`, "i") },
  });
  if (exact) return exact;

  const partial = await tasks.findOne({
    createdBy: userId,
    title: { $regex: new RegExp(escapeRegex(cleaned), "i") },
    status: { $ne: "cancelled" },
  });
  if (partial) return partial;

  const words = cleaned.split(/\s+/).filter((w) => w.length > 2);
  if (words.length === 0) return null;

  const pattern = words.map(escapeRegex).join(".*");
  return tasks.findOne({
    createdBy: userId,
    title: { $regex: new RegExp(pattern, "i") },
    status: { $ne: "cancelled" },
  });
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
