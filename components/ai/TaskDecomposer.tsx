"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";

interface TaskDecomposerProps {
  taskTitle: string;
  onApply?: (subtasks: { title: string }[]) => void;
}

export function TaskDecomposer({ taskTitle, onApply }: TaskDecomposerProps) {
  const [loading, setLoading] = useState(false);
  const [subtasks, setSubtasks] = useState<{ title: string; priority: string }[]>([]);

  async function decompose() {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/decompose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: taskTitle }),
      });
      const data = await res.json();
      setSubtasks(data.subtasks ?? []);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <h3 className="font-medium text-slate-200">Decompose: {taskTitle}</h3>
      <Button size="sm" className="mt-3" onClick={decompose} loading={loading}>
        Break into subtasks
      </Button>
      {loading ? <Spinner className="mt-4" size="sm" /> : null}
      {subtasks.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {subtasks.map((s, i) => (
            <li key={i} className="text-sm text-slate-300">
              • {s.title}
            </li>
          ))}
          <Button size="sm" className="mt-2" onClick={() => onApply?.(subtasks)}>
            Apply subtasks
          </Button>
        </ul>
      ) : null}
    </Card>
  );
}
