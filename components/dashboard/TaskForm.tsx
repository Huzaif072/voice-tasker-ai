"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import type { ContextTrigger, TaskPriority } from "@/types/task";

export interface TaskFormData {
  title: string;
  description?: string;
  priority: TaskPriority;
  dueDate?: string;
  reminderAt?: string;
  tags: string[];
  dependencies: string[];
  contextTriggers: ContextTrigger[];
  delegatedTo?: string;
}

interface TaskFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: TaskFormData) => void;
  submitting?: boolean;
  error?: string | null;
}

export function TaskForm({ open, onClose, onSubmit, submitting = false, error }: TaskFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [dueDate, setDueDate] = useState("");
  const [reminderAt, setReminderAt] = useState("");
  const [tags, setTags] = useState("");
  const [delegatedTo, setDelegatedTo] = useState("");
  const [dependencies, setDependencies] = useState("");
  const [triggerType, setTriggerType] = useState<ContextTrigger["type"]>("time");
  const [triggerValue, setTriggerValue] = useState("");
  const [triggerLatitude, setTriggerLatitude] = useState("");
  const [triggerLongitude, setTriggerLongitude] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const normalizedTitle = title.trim();
    if (!normalizedTitle || submitting) return;

    onSubmit({
      title: normalizedTitle,
      description: description.trim() || undefined,
      priority,
      dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
      reminderAt: reminderAt ? new Date(reminderAt).toISOString() : undefined,
      tags: tags.split(",").map((tag) => tag.trim()).filter(Boolean),
      dependencies: dependencies.split(",").map((id) => id.trim()).filter(Boolean),
      contextTriggers: triggerValue.trim() ? [{ type: triggerType, value: triggerValue.trim(), ...(triggerType === "location" || triggerType === "weather" ? { latitude: Number(triggerLatitude), longitude: Number(triggerLongitude) } : {}) }] : [],
      delegatedTo: delegatedTo.trim() || undefined,
    });
  }

  return (
    <Modal open={open} onClose={submitting ? () => undefined : onClose} title="New Task">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} required autoFocus className="border-slate-600 bg-slate-700 text-slate-100" />
        <div>
          <label htmlFor="task-description" className="mb-2 block text-sm font-medium text-slate-300">Description</label>
          <textarea id="task-description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-2.5 text-slate-100 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20" />
        </div>
        <div>
          <label htmlFor="task-priority" className="mb-2 block text-sm font-medium text-slate-300">Priority</label>
          <select id="task-priority" value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)} className="w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-2.5 text-slate-100">
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="task-due-date" className="mb-2 block text-sm font-medium text-slate-300">Due date</label>
            <input id="task-due-date" type="datetime-local" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-2.5 text-slate-100 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20" />
          </div>
          <div>
            <label htmlFor="task-reminder-at" className="mb-2 block text-sm font-medium text-slate-300">Reminder time</label>
            <input id="task-reminder-at" type="datetime-local" value={reminderAt} onChange={(e) => setReminderAt(e.target.value)} min={new Date().toISOString().slice(0, 16)} className="w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-2.5 text-slate-100 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20" />
          </div>
        </div>
        <Input label="Tags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="work, important, voice" className="border-slate-600 bg-slate-700 text-slate-100" />
        <Input label="Dependency IDs (comma separated)" value={dependencies} onChange={(e) => setDependencies(e.target.value)} placeholder="MongoDB task IDs" className="border-slate-600 bg-slate-700 text-slate-100" />
        <div className="rounded-lg border border-slate-700 p-3">
          <p className="mb-2 text-sm font-medium text-slate-300">Context trigger (optional)</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <select aria-label="Context trigger type" value={triggerType} onChange={(event) => setTriggerType(event.target.value as ContextTrigger["type"])} className="rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-slate-100">
              <option value="time">Time</option><option value="location">Location</option><option value="weather">Weather</option><option value="calendar">Calendar keyword</option>
            </select>
            <Input label="Value" value={triggerValue} onChange={(event) => setTriggerValue(event.target.value)} placeholder={triggerType === "time" ? "2026-09-01T09:00:00.000Z" : triggerType === "weather" ? "rain" : "office"} className="border-slate-600 bg-slate-700 text-slate-100" />
          </div>
          {triggerType === "location" || triggerType === "weather" ? <div className="mt-3 grid gap-3 sm:grid-cols-2"><Input label="Latitude" type="number" value={triggerLatitude} onChange={(event) => setTriggerLatitude(event.target.value)} className="border-slate-600 bg-slate-700 text-slate-100" /><Input label="Longitude" type="number" value={triggerLongitude} onChange={(event) => setTriggerLongitude(event.target.value)} className="border-slate-600 bg-slate-700 text-slate-100" /></div> : null}
        </div>
        <Input label="Delegate to (email)" type="email" value={delegatedTo} onChange={(e) => setDelegatedTo(e.target.value)} placeholder="teammate@example.com" className="border-slate-600 bg-slate-700 text-slate-100" />
        {error ? <p className="text-sm text-red-400" role="alert">{error}</p> : null}
        <div className="flex gap-2 pt-2">
          <Button type="submit" className="flex-1" loading={submitting}>Create Task</Button>
          <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>Cancel</Button>
        </div>
      </form>
    </Modal>
  );
}
