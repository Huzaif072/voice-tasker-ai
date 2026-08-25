"use client";

import { motion } from "framer-motion";
import { TaskCard } from "./TaskCard";
import type { Task } from "@/types/task";

interface TaskListProps {
  tasks: Task[];
  onToggle?: (id: string) => void;
  onDelete?: (id: string) => void;
  onEdit?: (task: Task) => void;
  onReschedule?: (id: string) => void;
  emptyMessage?: string;
}

export function TaskList({ tasks, onToggle, onDelete, onEdit, onReschedule, emptyMessage = "No tasks yet. Try speaking one!" }: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-700 py-12 text-center">
        <p className="text-slate-400">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
      className="space-y-3"
    >
      {tasks.map((task) => (
        <TaskCard key={task._id} task={task} onToggle={onToggle} onDelete={onDelete} onEdit={onEdit} onReschedule={onReschedule} />
      ))}
    </motion.div>
  );
}
