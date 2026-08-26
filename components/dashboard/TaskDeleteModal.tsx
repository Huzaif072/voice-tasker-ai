"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

interface TaskDeleteModalProps {
  open: boolean;
  taskTitle: string;
  deleting: boolean;
  error?: string | null;
  onClose: () => void;
  onConfirm: () => void;
}

export function TaskDeleteModal({ open, taskTitle, deleting, error, onClose, onConfirm }: TaskDeleteModalProps) {
  return (
    <Modal open={open} onClose={deleting ? () => undefined : onClose} title="Delete task?" className="max-w-md">
      <div className="flex gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-300" aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-red-100">This action cannot be undone.</p>
          <p className="mt-1 break-words text-sm leading-6 text-slate-300">
            You are about to permanently delete <span className="font-semibold text-slate-100">“{taskTitle}”</span>.
          </p>
        </div>
      </div>
      {error ? <p className="mt-3 text-sm text-red-300" role="alert">{error}</p> : null}
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" onClick={onClose} disabled={deleting} className="w-full sm:w-auto">Cancel</Button>
        <Button type="button" onClick={onConfirm} loading={deleting} className="w-full bg-red-600 shadow-lg shadow-red-600/20 hover:bg-red-500 hover:shadow-red-600/30 focus:ring-red-500 sm:w-auto">Delete task</Button>
      </div>
    </Modal>
  );
}
