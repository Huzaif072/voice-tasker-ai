"use client";

import { motion } from "framer-motion";
import { Mic } from "lucide-react";
import { cn } from "@/lib/utils/classnames";
import { VoiceWaveform } from "./VoiceWaveform";

interface VoiceMicButtonProps {
  isRecording?: boolean;
  isProcessing?: boolean;
  onClick?: () => void;
  size?: "md" | "lg";
  className?: string;
}

export function VoiceMicButton({
  isRecording = false,
  isProcessing = false,
  onClick,
  size = "lg",
  className,
}: VoiceMicButtonProps) {
  const sizes = { md: "h-14 w-14", lg: "h-16 w-16" };
  const iconSizes = { md: "h-6 w-6", lg: "h-7 w-7" };

  return (
    <div className={cn("relative flex items-center justify-center", className)}>
      {isRecording ? (
        <>
          <motion.div
            className="absolute inset-0 rounded-full bg-violet-600/30"
            animate={{ scale: [1, 1.5, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
          <motion.div
            className="absolute inset-0 rounded-full bg-violet-600/20"
            animate={{ scale: [1, 1.8, 1], opacity: [0.4, 0, 0.4] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
          />
        </>
      ) : null}

      <motion.button
        type="button"
        onClick={onClick}
        disabled={isProcessing}
        aria-pressed={isRecording}
        aria-busy={isProcessing}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={cn(
          "relative z-10 flex items-center justify-center rounded-full bg-violet-600 text-white shadow-lg shadow-violet-600/40",
          "focus:outline-none focus-visible:ring-4 focus-visible:ring-violet-500/30",
          isRecording && "bg-red-500 shadow-red-500/40",
          sizes[size]
        )}
        aria-label={isRecording ? "Stop recording" : "Start voice input"}
      >
        {isProcessing ? (
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        ) : (
          <Mic className={iconSizes[size]} />
        )}
      </motion.button>

      {isRecording ? (
        <div className="absolute -top-12 left-1/2 -translate-x-1/2">
          <VoiceWaveform active bars={6} className="h-8" />
        </div>
      ) : null}
    </div>
  );
}
