"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Trash2, Check, Pencil, CalendarClock, ExternalLink, CalendarPlus } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { formatRelativeDate } from "@/lib/utils/date";
import { priorityConfig } from "@/lib/utils/priority";
import type { Task } from "@/types/task";
import { cn } from "@/lib/utils/classnames";
import { useAuth } from "@/hooks/useAuth";

interface TaskCardProps {
  task: Task;
  onToggle?: (id: string) => void;
  onDelete?: (id: string) => void;
  onEdit?: (task: Task) => void;
  onReschedule?: (id: string) => void;
}

export function TaskCard({ task, onToggle, onDelete, onEdit, onReschedule }: TaskCardProps) {
  const { user } = useAuth();
  const isOwner = user?.id === task.createdBy;
  const priority = priorityConfig[task.priority] ?? priorityConfig.medium;
  const subtasks = Array.isArray(task.subtasks) ? task.subtasks : [];
  const tags = Array.isArray(task.tags) ? task.tags : [];
  const completedSubtasks = subtasks.filter((s) => s.completed).length;
  const isCompleted = task.status === "completed";
  const [creatingEvent, setCreatingEvent] = useState(false);
  const [createdEventUrl, setCreatedEventUrl] = useState<string | undefined>();
  const eventUrl = task.calendarEventUrl ?? createdEventUrl;
  const [calendarError, setCalendarError] = useState<string | null>(null);
  async function createEvent() {
    if (!task._id || creatingEvent) return;
    setCreatingEvent(true);
    setCalendarError(null);
    try {
      const response = await fetch("/api/calendar/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ taskId: task._id }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Unable to create calendar event");
      setCreatedEventUrl(result.eventUrl);
    } catch (error) {
      setCalendarError(error instanceof Error ? error.message : "Unable to create calendar event");
    } finally {
      setCreatingEvent(false);
    }
  }

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
          {eventUrl ? <a href={eventUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-emerald-300 hover:text-emerald-200"><ExternalLink className="h-3 w-3" />Calendar event</a> : task.calendarLink ? <a href={task.calendarLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-violet-300 hover:text-violet-200"><ExternalLink className="h-3 w-3" />Calendar link</a> : isOwner && task.dueDate ? <button type="button" onClick={() => void createEvent()} disabled={creatingEvent} className="inline-flex items-center gap-1 text-violet-300 hover:text-violet-200 disabled:opacity-50"><CalendarPlus className="h-3 w-3" />{creatingEvent ? "Creating…" : "Add to Calendar"}</button> : null}
          {calendarError ? <span className="text-red-400" role="alert">{calendarError}</span> : null}
          {task.dueDate ? <span>Due {formatRelativeDate(task.dueDate)}</span> : null}
          {subtasks.length > 0 ? (
            <span>
              {completedSubtasks}/{subtasks.length} subtasks
            </span>
          ) : null}
          {task.dependencies?.length ? <span className="text-amber-400">Depends on {task.dependencies.length} task{task.dependencies.length === 1 ? "" : "s"}</span> : null}
          {!isOwner ? <span className="text-cyan-300">Assigned to you{task.assignmentStatus === "accepted" ? " · accepted" : task.assignmentStatus === "pending" ? " · awaiting response" : ""}</span> : null}
          {tags.map((tag) => (
            <span key={tag} className="rounded bg-slate-700 px-1.5 py-0.5">
              {tag}
            </span>
          ))}
        </div>
      </div>

      {isOwner && onReschedule && task._id && !isCompleted ? <button type="button" onClick={() => onReschedule(task._id!)} className="opacity-70 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 text-slate-500 hover:text-violet-300" aria-label={`Reschedule ${task.title} to tomorrow`}
><CalendarClock className="h-4 w-4" /></button> : null}

      {isOwner && onEdit && task._id ? (
        <button
          type="button"
          onClick={() => onEdit(task)}
          className="opacity-0 transition-opacity group-hover:opacity-100 text-slate-500 hover:text-violet-300"
          aria-label={`Edit ${task.title}`}
        >
          <Pencil className="h-4 w-4" />
        </button>
      ) : null}

      {isOwner ? <button
        type="button"
        onClick={() => onDelete?.(task._id!)}
        className="opacity-0 transition-opacity group-hover:opacity-100 text-slate-500 hover:text-red-400"
        aria-label="Delete task"
      >
        <Trash2 className="h-4 w-4" />
      </button> : null}
    </motion.div>
  );
}
