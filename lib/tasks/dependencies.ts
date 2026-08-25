import { ObjectId } from "mongodb";
import type { Collection } from "mongodb";
import type { TaskDocument } from "@/lib/db/models/Task";

export async function validateTaskDependencies(
  tasks: Collection<TaskDocument>,
  ownerId: string,
  taskId: string | undefined,
  dependencyIds: string[],
): Promise<string | null> {
  const uniqueIds = [...new Set(dependencyIds)];
  if (taskId && uniqueIds.includes(taskId)) return "A task cannot depend on itself";
  const objectIds = uniqueIds.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id));
  if (objectIds.length !== uniqueIds.length) return "One or more dependency IDs are invalid";
  if (uniqueIds.length === 0) return null;

  const dependencyRows = await tasks.find(
    { _id: { $in: objectIds }, createdBy: ownerId },
    { projection: { _id: 1, dependencies: 1 } },
  ).toArray();
  if (dependencyRows.length !== uniqueIds.length) return "Every dependency must belong to your account";

  const graph = new Map<string, string[]>();
  graph.set(taskId ?? "__new_task__", uniqueIds);
  for (const row of dependencyRows) {
    const id = row._id?.toString();
    if (id) graph.set(id, Array.isArray(row.dependencies) ? row.dependencies : []);
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();
  function hasCycle(node: string): boolean {
    if (visiting.has(node)) return true;
    if (visited.has(node)) return false;
    visiting.add(node);
    for (const dependency of graph.get(node) ?? []) {
      if (graph.has(dependency) && hasCycle(dependency)) return true;
    }
    visiting.delete(node);
    visited.add(node);
    return false;
  }

  return hasCycle(taskId ?? "__new_task__") ? "Task dependencies cannot contain a cycle" : null;
}

export function getIncompleteDependencyIds(task: { dependencies?: string[] }, tasks: Array<{ _id?: string; status?: string }>) {
  const completed = new Set(tasks.filter((task) => task.status === "completed").map((task) => task._id));
  return (task.dependencies ?? []).filter((id) => !completed.has(id));
}
