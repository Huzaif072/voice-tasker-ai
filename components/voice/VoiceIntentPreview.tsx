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
}

export function VoiceIntentPreview({ intent, onDismiss }: VoiceIntentPreviewProps) {
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

        <div className="mb-3 flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          <span className="text-sm text-emerald-300">
            Action completed — review the details below.
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

        <div className="mt-4">
          <Button size="sm" variant="ghost" onClick={onDismiss}>
            Dismiss
          </Button>
        </div>
      </Card>
    </motion.div>
  );
}
