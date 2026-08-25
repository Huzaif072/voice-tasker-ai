"use client";

import { keepPreviousData, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Task, TaskStatus } from "@/types/task";
import { normalizeTask } from "@/lib/tasks/normalize";
import { broadcastTaskChange } from "@/lib/tasks/sync";

export interface TaskPage { tasks: Task[]; page: number; limit: number; total: number; hasMore: boolean; }
export interface TaskQueryParams { page?: number; limit?: number; search?: string; status?: TaskStatus; active?: boolean; highPriority?: boolean; }

function buildTaskUrl(params: TaskQueryParams): string {
  const query = new URLSearchParams();
  if (params.page && params.page > 1) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));
  if (params.search?.trim()) query.set("search", params.search.trim());
  if (params.status) query.set("status", params.status);
  if (params.active) query.set("active", "true");
  if (params.highPriority) query.set("highPriority", "true");
  const suffix = query.toString();
  return suffix ? `/api/tasks?${suffix}` : "/api/tasks";
}

async function fetchTaskPage(params: TaskQueryParams): Promise<TaskPage> {
  const res = await fetch(buildTaskUrl(params));
  if (!res.ok) { const data = await res.json().catch(() => null); throw new Error(data?.error ?? "Failed to fetch tasks"); }
  const data = await res.json();
  return { tasks: Array.isArray(data.tasks) ? data.tasks.map((task: Partial<Task>) => normalizeTask(task)) : [], page: typeof data.page === "number" ? data.page : params.page ?? 1, limit: typeof data.limit === "number" ? data.limit : params.limit ?? 25, total: typeof data.total === "number" ? data.total : 0, hasMore: Boolean(data.hasMore) };
}

export function useTasks() {
  return useQuery({ queryKey: ["tasks", { page: 1, limit: 100 }], queryFn: () => fetchTaskPage({ page: 1, limit: 100 }), select: (data) => data.tasks, staleTime: 60_000, gcTime: 5 * 60_000, refetchOnWindowFocus: false });
}

export function usePaginatedTasks(params: TaskQueryParams) {
  const normalizedParams = { page: params.page ?? 1, limit: params.limit ?? 25, search: params.search?.trim() ?? "", status: params.status, active: Boolean(params.active), highPriority: Boolean(params.highPriority) };
  return useQuery({ queryKey: ["tasks", normalizedParams], queryFn: () => fetchTaskPage(normalizedParams), placeholderData: keepPreviousData, staleTime: 60_000, gcTime: 5 * 60_000, refetchOnWindowFocus: false });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (task: Partial<Task>) => {
      const res = await fetch("/api/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(task) });
      if (!res.ok) { const data = await res.json().catch(() => null); throw new Error(data?.error ?? "Failed to create task"); }
      return res.json();
    },
    onSuccess: () => { broadcastTaskChange("created"); void qc.invalidateQueries({ queryKey: ["tasks"] }); },
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Task> & { id: string }) => {
      const res = await fetch(`/api/tasks/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updates) });
      if (!res.ok) { const data = await res.json().catch(() => null); throw new Error(data?.error ?? "Failed to update task"); }
      return res.json();
    },
    onSuccess: () => { broadcastTaskChange("updated"); void qc.invalidateQueries({ queryKey: ["tasks"] }); },
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
      if (!res.ok) { const data = await res.json().catch(() => null); throw new Error(data?.error ?? "Failed to delete task"); }
    },
    onSuccess: () => { broadcastTaskChange("deleted"); void qc.invalidateQueries({ queryKey: ["tasks"] }); },
  });
}
