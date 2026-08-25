import type { Collection } from "mongodb";
import type { TaskDocument } from "@/lib/db/models/Task";
import { decryptTaskDocument, taskSearchTokens } from "@/lib/privacy/taskEncryption";

function escapeRegex(value: string) { return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

export async function findTasksByTitle(
  tasks: Collection<TaskDocument>,
  userId: string,
  title: string,
  limit = 5,
): Promise<TaskDocument[]> {
  const cleaned = title.trim();
  if (!cleaned) return [];
  const searchTokens = taskSearchTokens({ title: cleaned });
  const candidates = await tasks.find({ createdBy: userId, status: { $ne: "cancelled" }, $or: [{ searchTokens: { $all: searchTokens } }, { title: { $regex: escapeRegex(cleaned), $options: "i" } }] }).sort({ updatedAt: -1 }).limit(500).toArray();
  const lowered = cleaned.toLowerCase();
  const words = lowered.split(/\s+/).filter((word) => word.length > 2);
  return candidates
    .map((candidate) => {
      const task = decryptTaskDocument(candidate);
      const candidateTitle = String(task.title ?? "").toLowerCase();
      const score = candidateTitle === lowered ? 3 : candidateTitle.includes(lowered) ? 2 : words.length && words.every((word) => candidateTitle.includes(word)) ? 1 : 0;
      return { task, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => item.task);
}

export async function findTaskByTitle(
  tasks: Collection<TaskDocument>,
  userId: string,
  title: string,
): Promise<TaskDocument | null> {
  return (await findTasksByTitle(tasks, userId, title, 1))[0] ?? null;
}
