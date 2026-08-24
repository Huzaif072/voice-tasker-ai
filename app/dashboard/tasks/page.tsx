"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { TaskList } from "@/components/dashboard/TaskList";
import { TaskFilters, type TaskFilter } from "@/components/dashboard/TaskFilters";
import { useTasks, useUpdateTask, useDeleteTask } from "@/hooks/useTasks";
import type { Task } from "@/types/task";

export default function TasksPage() {
  const { data: tasks = [], isLoading } = useTasks();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const [filter, setFilter] = useState<TaskFilter>("All");

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

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <h2 className="mb-6 text-2xl font-bold text-slate-100">All Tasks</h2>
      <TaskFilters active={filter} onChange={setFilter} />
      <div className="mt-4">
        {isLoading ? (
          <p className="text-slate-400">Loading...</p>
        ) : (
          <TaskList
            tasks={filtered as Task[]}
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
