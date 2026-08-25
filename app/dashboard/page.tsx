"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { DashboardStats } from "@/components/dashboard/DashboardStats";
import { TaskList } from "@/components/dashboard/TaskList";
import { TaskFilters, type TaskFilter } from "@/components/dashboard/TaskFilters";
import { TaskForm } from "@/components/dashboard/TaskForm";
import { Button } from "@/components/ui/Button";
import { useTasks, useUpdateTask, useDeleteTask, useCreateTask } from "@/hooks/useTasks";
import { useAuth } from "@/hooks/useAuth";
import { useDashboardSearch } from "@/hooks/useDashboardSearch";
import type { Task } from "@/types/task";

export default function DashboardPage() {
  const { user } = useAuth();
  const { data: tasks = [], isLoading, isError, refetch } = useTasks();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const createTask = useCreateTask();
  const [filter, setFilter] = useState<TaskFilter>("All");
  const [showForm, setShowForm] = useState(false);
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

  const stats = useMemo(() => {
    const today = new Date().toDateString();
    return {
      total: tasks.length,
      completedToday: tasks.filter(
        (t) => t.status === "completed" && new Date(t.updatedAt).toDateString() === today
      ).length,
      dueThisWeek: tasks.filter((t) => {
        if (!t.dueDate) return false;
        const due = new Date(t.dueDate);
        const week = new Date();
        week.setDate(week.getDate() + 7);
        return due <= week && t.status !== "completed";
      }).length,
      voiceCommands: tasks.filter((t) => t.tags?.includes("voice")).length,
    };
  }, [tasks]);

  function handleToggle(id: string) {
    if (updateTask.isPending) return;
    const task = tasks.find((t) => t._id === id);
    if (!task) return;
    updateTask.mutate({
      id,
      status: task.status === "completed" ? "pending" : "completed",
    });
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-100">
          Welcome back{user?.name ? `, ${user.name.split(" ")[0]}` : ""}!
        </h2>
        <p className="text-slate-400">
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      <DashboardStats
        totalTasks={stats.total}
        completedToday={stats.completedToday}
        dueThisWeek={stats.dueThisWeek}
        voiceCommands={stats.voiceCommands}
      />

      <div className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-100">Recent Tasks</h3>
          <Button
            size="sm"
            onClick={() => {
              createTask.reset();
              setShowForm(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Add Task
          </Button>
        </div>
        <TaskFilters active={filter} onChange={setFilter} />
        <div className="mt-4">
          {isLoading ? (
            <p className="text-slate-400" role="status">Loading tasks...</p>
          ) : isError ? (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-center">
              <p className="text-sm text-red-300" role="alert">We couldn’t load your tasks.</p>
              <button type="button" onClick={() => refetch()} className="mt-3 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500">
                Try again
              </button>
            </div>
          ) : (
            <TaskList
              tasks={filtered as Task[]}
              emptyMessage={search.trim() ? "No tasks match your search." : undefined}
              onToggle={handleToggle}
              onDelete={(id) => {
                if (deleteTask.isPending) return;
                const task = tasks.find((item) => item._id === id);
                if (window.confirm(`Delete${task?.title ? ` “${task.title}”` : " this task"}?`)) {
                  deleteTask.mutate(id);
                }
              }}
            />
          )}
        </div>
        {updateTask.isError || deleteTask.isError ? (
          <p className="mt-3 text-sm text-red-400" role="alert">
            {updateTask.isError ? "Unable to update that task." : "Unable to delete that task."}
          </p>
        ) : null}
      </div>

      <TaskForm
        key={showForm ? "task-form-open" : "task-form-closed"}
        open={showForm}
        onClose={() => {
          if (!createTask.isPending) setShowForm(false);
        }}
        submitting={createTask.isPending}
        error={createTask.isError ? (createTask.error instanceof Error ? createTask.error.message : "Unable to create task") : null}
        onSubmit={(data) => {
          const dueDate = data.dueDate ? new Date(data.dueDate).toISOString() : undefined;
          createTask.mutate(
            {
              title: data.title,
              description: data.description,
              priority: data.priority,
              dueDate,
              tags: data.tags,
              delegatedTo: data.delegatedTo,
            },
            { onSuccess: () => setShowForm(false) }
          );
        }}
      />
    </motion.div>
  );
}
