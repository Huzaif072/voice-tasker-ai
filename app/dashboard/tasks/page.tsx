"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { TaskList } from "@/components/dashboard/TaskList";
import { TaskFilters, type TaskFilter } from "@/components/dashboard/TaskFilters";
import { useTasks, useUpdateTask, useDeleteTask } from "@/hooks/useTasks";
import type { Task } from "@/types/task";
import { useDashboardSearch } from "@/hooks/useDashboardSearch";

export default function TasksPage() {
  const { data: tasks = [], isLoading, isError, refetch } = useTasks();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const [filter, setFilter] = useState<TaskFilter>("All");
  const { search } = useDashboardSearch();

  const filtered = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const byFilter = (() => {
      switch (filter) {
        case "Active":
          return tasks.filter((t) => t.status !== "completed");
        case "Completed":
          return tasks.filter((t) => t.status === "completed");
        case "High Priority":
          return tasks.filter((t) => t.priority === "high" || t.priority === "urgent");
        default:
          return tasks;
      }
    })();

    if (!normalizedSearch) return byFilter;
    return byFilter.filter((task) =>
      [task.title, task.description, ...task.tags]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(normalizedSearch))
    );
  }, [tasks, filter, search]);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <h2 className="mb-6 text-2xl font-bold text-slate-100">All Tasks</h2>
      <TaskFilters active={filter} onChange={setFilter} />
      <div className="mt-4">
        {isLoading ? (
          <p className="text-slate-400" role="status">Loading tasks...</p>
        ) : isError ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-center">
            <p className="text-sm text-red-300">We couldn’t load your tasks.</p>
            <button type="button" onClick={() => refetch()} className="mt-3 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500">
              Try again
            </button>
          </div>
        ) : (
          <TaskList
            tasks={filtered as Task[]}
            emptyMessage={search.trim() ? "No tasks match your search." : undefined}
            onToggle={(id) => {
              const task = tasks.find((t) => t._id === id);
              if (task)
                updateTask.mutate({
                  id,
                  status: task.status === "completed" ? "pending" : "completed",
                });
            }}
            onDelete={(id) => deleteTask.mutate(id)}
          />
        )}
      </div>
    </motion.div>
  );
}
