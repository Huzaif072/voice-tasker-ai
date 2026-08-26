"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { TaskList } from "@/components/dashboard/TaskList";
import { TaskFilters, type TaskFilter } from "@/components/dashboard/TaskFilters";
import { usePaginatedTasks, useUpdateTask, useDeleteTask } from "@/hooks/useTasks";
import type { Task } from "@/types/task";
import { useDashboardSearch } from "@/hooks/useDashboardSearch";
import { TaskEditorModal } from "@/components/dashboard/TaskEditorModal";
import { TaskDeleteModal } from "@/components/dashboard/TaskDeleteModal";

export default function TasksPage() {
  const [filter, setFilter] = useState<TaskFilter>("All");
  const [page, setPage] = useState(1);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deletingTask, setDeletingTask] = useState<{ id: string; title: string } | null>(null);
  const { search } = useDashboardSearch();
  const taskPageQuery = usePaginatedTasks({
    page: search.trim() ? 1 : page,
    limit: 25,
    search,
    status: filter === "Completed" ? "completed" : undefined,
    active: filter === "Active",
    highPriority: filter === "High Priority",
    scope: filter === "Assigned to me" ? "assigned" : "owned",
  });
  const tasks = taskPageQuery.data?.tasks ?? [];
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  useEffect(() => {
    const taskId = new URLSearchParams(window.location.search).get("task");
    if (!taskId) return;
    const controller = new AbortController();
    fetch(`/api/tasks/${encodeURIComponent(taskId)}`, { signal: controller.signal })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Unable to load task");
        return data.task as Task;
      })
      .then((task) => {
        setEditingTask(task);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        console.error("Task deep-link error:", error);
      });
    return () => controller.abort();
  }, []);

  function changeFilter(nextFilter: TaskFilter) {
    setFilter(nextFilter);
    setPage(1);
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-100">All Tasks</h2>
          {taskPageQuery.data ? <p className="mt-1 text-sm text-slate-500">{taskPageQuery.data.total} total task{taskPageQuery.data.total === 1 ? "" : "s"}</p> : null}
        </div>
      </div>
      <TaskFilters active={filter} onChange={changeFilter} />
      <div className="mt-4">
        {taskPageQuery.isLoading ? (
          <p className="text-slate-400" role="status">Loading tasks...</p>
        ) : taskPageQuery.isError ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-center">
            <p className="text-sm text-red-300" role="alert">We couldn’t load your tasks.</p>
            <button type="button" onClick={() => taskPageQuery.refetch()} className="mt-3 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500">Try again</button>
          </div>
        ) : (
          <TaskList
            tasks={tasks}
            emptyMessage={search.trim() ? "No tasks match your search." : undefined}
            onEdit={(task) => {
              updateTask.reset();
              setEditingTask(task);
            }}
            onReschedule={(id) => {
              if (updateTask.isPending) return;
              const tomorrow = new Date();
              tomorrow.setDate(tomorrow.getDate() + 1);
              tomorrow.setHours(9, 0, 0, 0);
              const task = tasks.find((item) => item._id === id);
              updateTask.mutate({ id, dueDate: tomorrow.toISOString(), baseUpdatedAt: task?.updatedAt });
            }}
            onToggle={(id) => {
              if (updateTask.isPending) return;
              const task = tasks.find((item) => item._id === id);
              if (task) updateTask.mutate({ id, status: task.status === "completed" ? "pending" : "completed", baseUpdatedAt: task.updatedAt });
            }}
            onDelete={(id) => {
              if (deleteTask.isPending) return;
              const task = tasks.find((item) => item._id === id);
              if (!task?._id) return;
              deleteTask.reset();
              setDeletingTask({ id: task._id, title: task.title });
            }}
          />
        )}
      </div>
      {taskPageQuery.isFetching && !taskPageQuery.isLoading ? <p className="mt-3 text-xs text-slate-500" role="status">Updating task results...</p> : null}
      {updateTask.isError ? <p className="mt-3 text-sm text-red-400" role="alert">Unable to update that task.</p> : null}
      {taskPageQuery.data && (taskPageQuery.data.page > 1 || taskPageQuery.data.hasMore) ? (
        <nav className="mt-6 flex items-center justify-between" aria-label="Task pages">
          <button type="button" disabled={page <= 1 || taskPageQuery.isFetching} onClick={() => setPage((current) => Math.max(1, current - 1))} className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40">Previous</button>
          <span className="text-sm text-slate-500">Page {taskPageQuery.data.page}</span>
          <button type="button" disabled={!taskPageQuery.data.hasMore || taskPageQuery.isFetching} onClick={() => setPage((current) => current + 1)} className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40">Next</button>
        </nav>
      ) : null}
      <TaskEditorModal
        key={editingTask ? `${editingTask._id}-${editingTask.updatedAt}` : "task-editor-closed"}
        open={Boolean(editingTask)}
        task={editingTask}
        saving={updateTask.isPending}
        error={updateTask.isError ? (updateTask.error instanceof Error ? updateTask.error.message : "Unable to save task") : null}
        onClose={() => {
          if (!updateTask.isPending) {
            updateTask.reset();
            setEditingTask(null);
          }
        }}
        onSave={(data) => {
          if (!editingTask?._id) return;
          updateTask.mutate({ id: editingTask._id, ...data, baseUpdatedAt: editingTask.updatedAt }, { onSuccess: () => setEditingTask(null) });
        }}
      />
      <TaskDeleteModal
        open={Boolean(deletingTask)}
        taskTitle={deletingTask?.title ?? "this task"}
        deleting={deleteTask.isPending}
        error={deleteTask.isError ? (deleteTask.error instanceof Error ? deleteTask.error.message : "Unable to delete that task.") : null}
        onClose={() => {
          if (!deleteTask.isPending) {
            deleteTask.reset();
            setDeletingTask(null);
          }
        }}
        onConfirm={() => {
          if (!deletingTask || deleteTask.isPending) return;
          deleteTask.mutate(deletingTask.id, { onSuccess: () => setDeletingTask(null) });
        }}
      />
    </motion.div>
  );
}
