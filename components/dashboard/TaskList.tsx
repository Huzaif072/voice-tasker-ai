"use client";

import { motion } from "framer-motion";
import { TaskCard } from "./TaskCard";
import type { Task } from "@/types/task";

interface TaskListProps {
  tasks: Task[];
  onToggle?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function TaskList({ tasks, onToggle, onDelete }: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-700 py-12 text-center">
        <p className="text-slate-400">No tasks yet. Try speaking one!</p>
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
        <TaskCard key={task._id} task={task} onToggle={onToggle} onDelete={onDelete} />
      ))}
    </motion.div>
  );
}
