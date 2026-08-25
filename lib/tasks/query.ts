import type { Filter } from "mongodb";
import { z } from "zod";
import type { TaskDocument } from "@/lib/db/models/Task";
import { taskSearchTokens } from "@/lib/privacy/taskEncryption";

const booleanQuery = z.preprocess(
  (value) => value === true || value === "true",
  z.boolean()
).default(false);

export const taskQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().trim().max(100).default(""),
  status: z.enum(["pending", "in_progress", "completed", "cancelled"]).optional(),
  active: booleanQuery,
  highPriority: booleanQuery,
  scope: z.enum(["owned", "assigned", "all"]).default("owned"),
});

export type TaskQuery = z.infer<typeof taskQuerySchema>;

export function buildTaskFilter(userId: string, query: TaskQuery): Filter<TaskDocument> {
  const filter: Filter<TaskDocument> = query.scope === "assigned"
    ? { assigneeUserId: userId }
    : query.scope === "all"
      ? { $or: [{ createdBy: userId }, { assigneeUserId: userId }] }
      : { createdBy: userId };
  if (query.status) filter.status = query.status;
  if (query.active) filter.status = { $in: ["pending", "in_progress"] };
  if (query.highPriority) filter.priority = { $in: ["high", "urgent"] };
  if (query.search) {
    const searchTokens = taskSearchTokens({ title: query.search });
    const contentSearch = searchTokens.length ? [{ searchTokens: { $all: searchTokens } }, { $text: { $search: query.search } }] : [{ $text: { $search: query.search } }];
    if (filter.$or) {
      const ownership = filter.$or;
      delete filter.$or;
      filter.$and = [{ $or: ownership }, { $or: contentSearch }];
    } else {
      filter.$or = contentSearch;
    }
  }
  return filter;
}

export function taskCacheKey(userId: string, query: TaskQuery): string {
  return `tasks:${userId}:${query.page}:${query.limit}:${encodeURIComponent(query.search)}:${query.status ?? "all"}:${query.active ? "active" : "all-statuses"}:${query.highPriority ? "high-priority" : "all-priorities"}:${query.scope}`;
}
