import type { Db, Collection, ObjectId } from "mongodb";
import type { Task } from "@/types/task";

export type TaskDocument = Omit<Task, "_id"> & { _id?: ObjectId };

export const TASKS_COLLECTION = "tasks";

export async function getTasksCollection(db: Db): Promise<Collection<TaskDocument>> {
  const col = db.collection<TaskDocument>(TASKS_COLLECTION);
  await Promise.all([
    col.createIndex({ dueDate: 1 }),
    col.createIndex({ priority: 1 }),
    col.createIndex({ createdBy: 1, status: 1 }),
    col.createIndex({ createdBy: 1, dueDate: 1 }),
  ]);
  return col;
}
