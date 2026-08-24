"use client";

import { motion } from "framer-motion";
import { Trash2, Check } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { formatRelativeDate } from "@/lib/utils/date";
import { priorityConfig } from "@/lib/utils/priority";
import type { Task } from "@/types/task";
import { cn } from "@/lib/utils/classnames";

interface TaskCardProps {
  task: Task;
  onToggle?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function TaskCard({ task, onToggle, onDelete }: TaskCardProps) {
  const priority = priorityConfig[task.priority];
  const completedSubtasks = task.subtasks.filter((s) => s.completed).length;
  const isCompleted = task.status === "completed";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className={cn(
        "group flex items-start gap-4 rounded-xl border border-slate-700/50 bg-slate-800/80 p-4 transition-colors hover:border-violet-500/20",
        isCompleted && "opacity-60"
      )}
    >
      <button
        onClick={() => onToggle?.(task._id!)}
        className={cn(
          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors",
          isCompleted
            ? "border-violet-500 bg-violet-500 text-white"
            : "border-slate-600 hover:border-violet-500"
        )}
      >
        {isCompleted ? <Check className="h-3 w-3" /> : null}
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className={cn("font-medium text-slate-100", isCompleted && "line-through")}>
            {task.title}
          </h3>
          <Badge className={cn(priority.bg, priority.color)}>{priority.label}</Badge>
        </div>
        {task.description ? (
          <p className="mt-1 text-sm text-slate-400 line-clamp-2">{task.description}</p>
        ) : null}
        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
          {task.dueDate ? <span>Due {formatRelativeDate(task.dueDate)}</span> : null}
          {task.subtasks.length > 0 ? (
            <span>
              {completedSubtasks}/{task.subtasks.length} subtasks
            </span>
          ) : null}
          {task.tags.map((tag) => (
            <span key={tag} className="rounded bg-slate-700 px-1.5 py-0.5">
              {tag}
            </span>
          ))}
        </div>
      </div>

      <button
        onClick={() => onDelete?.(task._id!)}
        className="opacity-0 transition-opacity group-hover:opacity-100 text-slate-500 hover:text-red-400"
        aria-label="Delete task"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </motion.div>
  );
}
