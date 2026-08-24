"use client";

import { motion } from "framer-motion";
import { Sparkles, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { ParsedIntent } from "@/types/voice";

interface VoiceIntentPreviewProps {
  intent: ParsedIntent & { confidence: number };
  onDismiss?: () => void;
  onConfirm?: () => void;
  onSelectTask?: (title: string) => void;
}

export function VoiceIntentPreview({ intent, onDismiss, onConfirm, onSelectTask }: VoiceIntentPreviewProps) {
  const needsConfirmation = intent.confidence < 0.7;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <Card glow className="border-violet-500/30">
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-violet-400" />
          <span className="text-sm font-medium text-violet-300">AI Intent Preview</span>
          <Badge variant={needsConfirmation ? "amber" : "violet"}>
            {Math.round(intent.confidence * 100)}% confidence
          </Badge>
        </div>

        <div className={`mb-3 flex items-center gap-2 rounded-lg border px-3 py-2 ${intent.requiresConfirmation ? "border-amber-500/30 bg-amber-500/10" : "border-emerald-500/20 bg-emerald-500/10"}`}>
          <CheckCircle2 className={`h-4 w-4 shrink-0 ${intent.requiresConfirmation ? "text-amber-400" : "text-emerald-400"}`} />
          <span className={`text-sm ${intent.requiresConfirmation ? "text-amber-300" : "text-emerald-300"}`}>
            {intent.requiresConfirmation ? "Confirmation required before this action." : "Action completed — review the details below."}
          </span>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex gap-2">
            <span className="text-slate-400">Action:</span>
            <span className="font-medium capitalize text-slate-200">{intent.action}</span>
          </div>
          {intent.taskTitle ? (
            <div className="flex gap-2">
              <span className="text-slate-400">Task:</span>
              <span className="font-medium text-slate-200">{intent.taskTitle}</span>
            </div>
          ) : null}
          {intent.priority ? (
            <div className="flex gap-2">
              <span className="text-slate-400">Priority:</span>
              <Badge variant="red">{intent.priority}</Badge>
            </div>
          ) : null}
          {intent.dueDate ? (
            <div className="flex gap-2">
              <span className="text-slate-400">Due:</span>
              <span className="text-slate-200">{new Date(intent.dueDate).toLocaleDateString()}</span>
            </div>
          ) : null}
        </div>

        {intent.ambiguousTasks?.length ? (
          <div className="mt-4 space-y-2 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-200">
            <p>Choose a matching task or say its full title:</p>
            <div className="flex flex-wrap gap-2">{intent.ambiguousTasks.map((task) => <Button key={task.id} size="sm" variant="ghost" onClick={() => onSelectTask?.(task.title)}>{task.title}</Button>)}</div>
          </div>
        ) : null}
        <div className="mt-4 flex gap-2">
          {intent.requiresConfirmation ? <Button size="sm" onClick={onConfirm}>Confirm action</Button> : null}
          <Button size="sm" variant="ghost" onClick={onDismiss}>Dismiss</Button>
        </div>
      </Card>
    </motion.div>
  );
}
