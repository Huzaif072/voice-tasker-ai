"use client";

import { keepPreviousData, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Task, TaskStatus } from "@/types/task";
import { normalizeTask } from "@/lib/tasks/normalize";
import { broadcastTaskChange } from "@/lib/tasks/sync";
import { useAuth } from "@/hooks/useAuth";

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

function cacheKey(userId: string, params: TaskQueryParams) { return `voicetasker:tasks:${userId}:${encodeURIComponent(buildTaskUrl(params))}`; }
function readCachedPage(userId: string, params: TaskQueryParams): TaskPage | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(cacheKey(userId, params));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { data?: TaskPage; savedAt?: number };
    if (!parsed.data || !parsed.savedAt || Date.now() - parsed.savedAt > 7 * 24 * 60 * 60 * 1000) return null;
    return parsed.data;
  } catch { return null; }
}
function saveCachedPage(userId: string, params: TaskQueryParams, data: TaskPage) {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(cacheKey(userId, params), JSON.stringify({ savedAt: Date.now(), data })); } catch { /* Storage may be unavailable or full. */ }
}

async function fetchTaskPage(params: TaskQueryParams, userId: string): Promise<TaskPage> {
  try {
    const res = await fetch(buildTaskUrl(params));
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      if (res.status === 401 || res.status === 403) throw new Error(data?.error ?? "Authentication required");
      throw new Error(data?.error ?? "Failed to fetch tasks");
    }
    const data = await res.json();
    const page = { tasks: Array.isArray(data.tasks) ? data.tasks.map((task: Partial<Task>) => normalizeTask(task)) : [], page: typeof data.page === "number" ? data.page : params.page ?? 1, limit: typeof data.limit === "number" ? data.limit : params.limit ?? 25, total: typeof data.total === "number" ? data.total : 0, hasMore: Boolean(data.hasMore) };
    saveCachedPage(userId, params, page);
    return page;
  } catch (error) {
    const cached = readCachedPage(userId, params);
    if (cached) return cached;
    throw error;
  }
}

export function useTasks() {
  const { user } = useAuth();
  const params = { page: 1, limit: 100 };
  return useQuery({ queryKey: ["tasks", user?.id ?? "anonymous", params], queryFn: () => fetchTaskPage(params, user!.id), select: (data) => data.tasks, staleTime: 60_000, gcTime: 5 * 60_000, refetchOnWindowFocus: false, enabled: Boolean(user?.id) });
}

export function usePaginatedTasks(params: TaskQueryParams) {
  const { user } = useAuth();
  const normalizedParams = { page: params.page ?? 1, limit: params.limit ?? 25, search: params.search?.trim() ?? "", status: params.status, active: Boolean(params.active), highPriority: Boolean(params.highPriority) };
  return useQuery({ queryKey: ["tasks", user?.id ?? "anonymous", normalizedParams], queryFn: () => fetchTaskPage(normalizedParams, user!.id), placeholderData: keepPreviousData, staleTime: 60_000, gcTime: 5 * 60_000, refetchOnWindowFocus: false, enabled: Boolean(user?.id) });
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
    mutationFn: async ({ id, baseUpdatedAt, ...updates }: Partial<Task> & { id: string; baseUpdatedAt?: string }) => {
      const res = await fetch(`/api/tasks/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...updates, baseUpdatedAt }) });
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
