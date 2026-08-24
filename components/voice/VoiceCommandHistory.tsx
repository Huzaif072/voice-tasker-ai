"use client";

import { motion } from "framer-motion";
import { Mic } from "lucide-react";
import { formatRelativeDate } from "@/lib/utils/date";
import type { VoiceSession } from "@/types/voice";

interface VoiceCommandHistoryProps {
  sessions: VoiceSession[];
}

export function VoiceCommandHistory({ sessions }: VoiceCommandHistoryProps) {
  if (sessions.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-slate-500">No voice commands yet.</p>
    );
  }

  return (
    <div className="space-y-3">
      {sessions.map((session, i) => (
        <motion.div
          key={session._id ?? i}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.06 }}
          className="flex items-start gap-3 rounded-xl border border-slate-700/50 bg-slate-800/50 p-4"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-600/20">
            <Mic className="h-4 w-4 text-violet-400" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-slate-200">{session.inputText}</p>
            <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
              <span className="capitalize">{session.parsedIntent.action}</span>
              <span>·</span>
              <span>{Math.round(session.confidence * 100)}%</span>
              <span>·</span>
              <span>{formatRelativeDate(session.timestamp)}</span>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
