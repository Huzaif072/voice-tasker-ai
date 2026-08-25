"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { TaskDecomposer } from "@/components/ai/TaskDecomposer";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import type { ContextTrigger, Subtask, Task, TaskPriority, TaskStatus } from "@/types/task";

export interface TaskEditorData {
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string;
  reminderAt?: string;
  tags: string[];
  dependencies: string[];
  contextTriggers: ContextTrigger[];
  delegatedTo?: string;
  delegatedPhone?: string;
  subtasks: Subtask[];
}

interface TaskEditorModalProps { open: boolean; task: Task | null; onClose: () => void; onSave: (data: TaskEditorData) => void; saving?: boolean; error?: string | null; }

function toLocalDateTime(value?: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
function newSubtaskId(): string { return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `subtask-${Date.now()}-${Math.random().toString(36).slice(2)}`; }
function newTrigger(): ContextTrigger { return { type: "time", value: "" }; }
function formTriggerValue(trigger: ContextTrigger) { return trigger.type === "time" ? toLocalDateTime(trigger.value) : trigger.value; }

export function TaskEditorModal({ open, task, onClose, onSave, saving = false, error }: TaskEditorModalProps) {
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? "pending");
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? "medium");
  const [dueDate, setDueDate] = useState(toLocalDateTime(task?.dueDate));
  const [reminderAt, setReminderAt] = useState(toLocalDateTime(task?.reminderAt));
  const [tags, setTags] = useState(task?.tags.join(", ") ?? "");
  const [delegatedTo, setDelegatedTo] = useState(task?.delegatedTo ?? "");
  const [delegatedPhone, setDelegatedPhone] = useState(task?.delegatedPhone ?? "");
  const [dependencies, setDependencies] = useState((task?.dependencies ?? []).join(", "));
  const [contextTriggers, setContextTriggers] = useState<ContextTrigger[]>(task?.contextTriggers ?? []);
  const [subtasks, setSubtasks] = useState<Subtask[]>(task?.subtasks ?? []);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");

  function updateSubtask(id: string, updates: Partial<Subtask>) { setSubtasks((current) => current.map((subtask) => subtask.id === id ? { ...subtask, ...updates } : subtask)); }
  function addSubtask(titleToAdd = newSubtaskTitle) { const normalizedTitle = titleToAdd.trim(); if (!normalizedTitle) return; setSubtasks((current) => [...current, { id: newSubtaskId(), title: normalizedTitle, completed: false }]); setNewSubtaskTitle(""); }
  function updateTrigger(index: number, updates: Partial<ContextTrigger>) { setContextTriggers((current) => current.map((trigger, currentIndex) => currentIndex === index ? { ...trigger, ...updates } : trigger)); }
  function addTrigger() { setContextTriggers((current) => current.length >= 20 ? current : [...current, newTrigger()]); }
  function removeTrigger(index: number) { setContextTriggers((current) => current.filter((_, currentIndex) => currentIndex !== index)); }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const normalizedTitle = title.trim();
    if (!normalizedTitle || saving) return;
    const normalizedTriggers = contextTriggers.filter((trigger) => trigger.value.trim()).map((trigger) => {
      const value = trigger.type === "time" ? new Date(trigger.value).toISOString() : trigger.value.trim();
      const coordinates = trigger.type === "location" || trigger.type === "weather" ? { latitude: Number(trigger.latitude), longitude: Number(trigger.longitude) } : {};
      return { ...trigger, value, ...coordinates };
    });
    onSave({ title: normalizedTitle, description: description.trim() || undefined, status, priority, dueDate: dueDate ? new Date(dueDate).toISOString() : "", reminderAt: reminderAt ? new Date(reminderAt).toISOString() : "", tags: tags.split(",").map((tag) => tag.trim()).filter(Boolean), dependencies: dependencies.split(",").map((id) => id.trim()).filter(Boolean), contextTriggers: normalizedTriggers, delegatedTo: delegatedTo.trim() || undefined, delegatedPhone: delegatedPhone.trim() || undefined, subtasks: subtasks.filter((subtask) => subtask.title.trim()) });
  }

  return <Modal open={open} onClose={saving ? () => undefined : onClose} title={task ? `Edit ${task.title}` : "Edit task"} className="max-h-[90vh] overflow-y-auto">
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input label="Title" value={title} onChange={(event) => setTitle(event.target.value)} required autoFocus className="border-slate-600 bg-slate-700 text-slate-100" />
      <div><label htmlFor="edit-task-description" className="mb-2 block text-sm font-medium text-slate-300">Description</label><textarea id="edit-task-description" value={description} onChange={(event) => setDescription(event.target.value)} rows={3} className="w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-2.5 text-slate-100 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20" /></div>
      <div className="grid gap-4 sm:grid-cols-2"><div><label htmlFor="edit-task-status" className="mb-2 block text-sm font-medium text-slate-300">Status</label><select id="edit-task-status" value={status} onChange={(event) => setStatus(event.target.value as TaskStatus)} className="w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-2.5 text-slate-100"><option value="pending">Pending</option><option value="in_progress">In progress</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></div><div><label htmlFor="edit-task-priority" className="mb-2 block text-sm font-medium text-slate-300">Priority</label><select id="edit-task-priority" value={priority} onChange={(event) => setPriority(event.target.value as TaskPriority)} className="w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-2.5 text-slate-100"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option></select></div></div>
      <div className="grid gap-4 sm:grid-cols-2"><div><label htmlFor="edit-task-due-date" className="mb-2 block text-sm font-medium text-slate-300">Due date</label><input id="edit-task-due-date" type="datetime-local" value={dueDate} onChange={(event) => setDueDate(event.target.value)} className="w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-2.5 text-slate-100" /></div><div><label htmlFor="edit-task-reminder-at" className="mb-2 block text-sm font-medium text-slate-300">Reminder time</label><input id="edit-task-reminder-at" type="datetime-local" value={reminderAt} onChange={(event) => setReminderAt(event.target.value)} className="w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-2.5 text-slate-100" /></div></div>
      <div className="grid gap-4 sm:grid-cols-2"><Input label="Tags" value={tags} onChange={(event) => setTags(event.target.value)} placeholder="work, important" className="border-slate-600 bg-slate-700 text-slate-100" /><Input label="Delegated to (email)" type="email" value={delegatedTo} onChange={(event) => setDelegatedTo(event.target.value)} placeholder="teammate@example.com" className="border-slate-600 bg-slate-700 text-slate-100" /><Input label="Delegated phone (E.164)" type="tel" value={delegatedPhone} onChange={(event) => setDelegatedPhone(event.target.value)} placeholder="+15551234567" className="border-slate-600 bg-slate-700 text-slate-100" /></div>
      <Input label="Dependency IDs (comma separated)" value={dependencies} onChange={(event) => setDependencies(event.target.value)} placeholder="MongoDB task IDs" className="border-slate-600 bg-slate-700 text-slate-100" />
      <fieldset className="rounded-xl border border-slate-700/70 p-3"><div className="flex items-center justify-between"><legend className="px-1 text-sm font-medium text-slate-300">Context triggers</legend><Button type="button" size="sm" variant="secondary" onClick={addTrigger} disabled={contextTriggers.length >= 20}><Plus className="h-4 w-4" />Add trigger</Button></div><p className="mt-1 text-xs text-slate-500">Time values use your local editor time and are saved as ISO UTC. Location and weather triggers require coordinates.</p><div className="mt-3 space-y-3">{contextTriggers.map((trigger, index) => <div key={`${index}-${trigger.type}`} className="rounded-lg border border-slate-700/60 p-3"><div className="flex gap-2"><select aria-label={`Context trigger ${index + 1} type`} value={trigger.type} onChange={(event) => updateTrigger(index, { type: event.target.value as ContextTrigger["type"], recurrence: event.target.value === "time" ? trigger.recurrence : undefined })} className="min-w-0 flex-1 rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-slate-100"><option value="time">Time</option><option value="location">Location</option><option value="weather">Weather</option><option value="calendar">Calendar keyword</option><option value="keyword">Keyword</option></select><button type="button" onClick={() => removeTrigger(index)} aria-label={`Remove context trigger ${index + 1}`} className="rounded-lg p-2 text-slate-500 hover:bg-slate-700 hover:text-red-400"><Trash2 className="h-4 w-4" /></button></div><div className="mt-2"><Input label="Value" type={trigger.type === "time" ? "datetime-local" : "text"} value={formTriggerValue(trigger)} onChange={(event) => updateTrigger(index, { value: event.target.value })} placeholder={trigger.type === "time" ? "Choose date and time" : "office, rain, meeting"} className="border-slate-600 bg-slate-700 text-slate-100" /></div>{trigger.type === "time" ? <select aria-label={`Context trigger ${index + 1} recurrence`} value={trigger.recurrence ?? ""} onChange={(event) => updateTrigger(index, { recurrence: event.target.value ? event.target.value as ContextTrigger["recurrence"] : undefined })} className="mt-2 w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-slate-100"><option value="">One time</option><option value="hourly">Hourly</option><option value="daily">Daily</option><option value="weekly">Weekly</option></select> : null}{trigger.type === "location" || trigger.type === "weather" ? <div className="mt-2 grid gap-2 sm:grid-cols-2"><Input label="Latitude" type="number" value={trigger.latitude?.toString() ?? ""} onChange={(event) => updateTrigger(index, { latitude: Number(event.target.value) })} className="border-slate-600 bg-slate-700 text-slate-100" /><Input label="Longitude" type="number" value={trigger.longitude?.toString() ?? ""} onChange={(event) => updateTrigger(index, { longitude: Number(event.target.value) })} className="border-slate-600 bg-slate-700 text-slate-100" /></div> : null}</div>)}</div></fieldset>
      <fieldset className="rounded-xl border border-slate-700/70 p-3"><legend className="px-1 text-sm font-medium text-slate-300">Subtasks</legend><div className="space-y-2">{subtasks.map((subtask) => <div key={subtask.id} className="flex items-center gap-2"><input type="checkbox" checked={subtask.completed} onChange={(event) => updateSubtask(subtask.id, { completed: event.target.checked })} aria-label={`Complete ${subtask.title}`} className="h-4 w-4 accent-violet-500" /><input value={subtask.title} onChange={(event) => updateSubtask(subtask.id, { title: event.target.value })} aria-label="Subtask title" className="min-w-0 flex-1 rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-slate-100" /><button type="button" onClick={() => setSubtasks((current) => current.filter((item) => item.id !== subtask.id))} aria-label={`Remove ${subtask.title}`} className="rounded-lg p-2 text-slate-500 hover:bg-slate-700 hover:text-red-400"><Trash2 className="h-4 w-4" /></button></div>)}<div className="flex gap-2"><input value={newSubtaskTitle} onChange={(event) => setNewSubtaskTitle(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addSubtask(); } }} placeholder="Add a subtask" aria-label="New subtask title" className="min-w-0 flex-1 rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-slate-100" /><Button type="button" size="sm" variant="secondary" onClick={() => addSubtask()}><Plus className="h-4 w-4" />Add</Button></div></div></fieldset>
      {title.trim() ? <TaskDecomposer taskTitle={title.trim()} onApply={(generated) => setSubtasks(generated.map((item) => ({ id: newSubtaskId(), title: item.title, completed: false })))} /> : null}
      {error ? <p className="text-sm text-red-400" role="alert">{error}</p> : null}<div className="flex gap-2 pt-2"><Button type="submit" className="flex-1" loading={saving}>Save changes</Button><Button type="button" variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button></div>
    </form>
  </Modal>;
}
