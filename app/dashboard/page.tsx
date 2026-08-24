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
import type { Task } from "@/types/task";

export default function DashboardPage() {
  const { user } = useAuth();
  const { data: tasks = [], isLoading } = useTasks();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const createTask = useCreateTask();
  const [filter, setFilter] = useState<TaskFilter>("All");
  const [showForm, setShowForm] = useState(false);

  const filtered = useMemo(() => {
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
  }, [tasks, filter]);

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
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4" />
            Add Task
          </Button>
        </div>
        <TaskFilters active={filter} onChange={setFilter} />
        <div className="mt-4">
          {isLoading ? (
            <p className="text-slate-400">Loading tasks...</p>
          ) : (
            <TaskList
              tasks={filtered as Task[]}
              onToggle={handleToggle}
              onDelete={(id) => deleteTask.mutate(id)}
            />
          )}
        </div>
      </div>

      <TaskForm
        open={showForm}
        onClose={() => setShowForm(false)}
        onSubmit={(data) =>
          createTask.mutate({
            title: data.title,
            description: data.description,
            priority: data.priority as Task["priority"],
            status: "pending",
            subtasks: [],
            tags: [],
            contextTriggers: [],
            createdBy: user?.id ?? "",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          })
        }
      />
    </motion.div>
  );
}
