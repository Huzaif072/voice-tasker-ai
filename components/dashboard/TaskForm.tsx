"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";

interface TaskFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { title: string; description?: string; priority: string }) => void;
}

export function TaskForm({ open, onClose, onSubmit }: TaskFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({ title, description, priority });
    setTitle("");
    setDescription("");
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="New Task">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="border-slate-600 bg-slate-700 text-slate-100"
        />
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-300">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-2.5 text-slate-100 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-300">Priority</label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-2.5 text-slate-100"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
        <div className="flex gap-2 pt-2">
          <Button type="submit" className="flex-1">
            Create Task
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  );
}
