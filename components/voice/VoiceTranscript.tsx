"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/Card";

interface VoiceTranscriptProps {
  transcript: string;
  interim?: string;
  isListening?: boolean;
}

export function VoiceTranscript({ transcript, interim, isListening }: VoiceTranscriptProps) {
  const display = transcript + (interim ? ` ${interim}` : "");

  return (
    <Card className="min-h-[100px]">
      <div className="mb-2 flex items-center gap-2">
        <span aria-hidden="true" className={`h-2 w-2 rounded-full ${isListening ? "animate-pulse bg-red-500" : "bg-slate-500"}`} />
        <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
          {isListening ? "Listening..." : "Transcript"}
        </span>
      </div>
      <AnimatePresence mode="wait">
        <motion.p
          key={display}
          aria-live="polite"
          aria-atomic="true"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-slate-200 leading-relaxed"
        >
          {display || (
            <span className="text-slate-500 italic">Speak to create a task...</span>
          )}
          {interim ? <span className="text-slate-400">{` ${interim}`}</span> : null}
        </motion.p>
      </AnimatePresence>
    </Card>
  );
}
