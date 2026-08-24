"use client";

import { motion } from "framer-motion";

interface VoiceWaveformProps {
  active?: boolean;
  bars?: number;
  className?: string;
  color?: string;
}

export function VoiceWaveform({
  active = true,
  bars = 8,
  className = "",
  color = "#7C3AED",
}: VoiceWaveformProps) {
  return (
    <div className={`flex items-end justify-center gap-1 ${className}`}>
      {Array.from({ length: bars }).map((_, i) => (
        <motion.div
          key={i}
          className="w-1 rounded-full"
          style={{ backgroundColor: color }}
          animate={
            active
              ? {
                  height: ["8px", `${12 + ((i * 11) % 28)}px`, "8px"],
                  opacity: [0.4, 1, 0.4],
                }
              : { height: "8px", opacity: 0.3 }
          }
          transition={{
            duration: 0.6 + (i % 3) * 0.15,
            repeat: Infinity,
            delay: i * 0.08,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}
