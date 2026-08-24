"use client";

import Link from "next/link";
import { Mic } from "lucide-react";
import { motion } from "framer-motion";
import { VoiceWaveform } from "@/components/voice/VoiceWaveform";

const floatingTasks = [
  { title: "Finish Q3 budget", due: "Today" },
  { title: "Review design mockups", due: "Tomorrow" },
  { title: "Call with Sarah", due: "Friday" },
];

interface AuthLayoutProps {
  children: React.ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen bg-slate-900">
      <div className="flex w-full flex-col justify-center px-8 py-12 lg:w-[40%] lg:px-16 bg-slate-900 border-r border-slate-800">
        <Link href="/" className="mb-12 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600">
            <Mic className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-bold text-slate-100">VoiceTasker AI</span>
        </Link>
        {children}
      </div>

      <div className="relative hidden flex-1 overflow-hidden lg:flex lg:w-[60%]">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at 30% 50%, rgba(124, 58, 237, 0.15) 0%, rgba(15, 23, 42, 1) 60%)",
          }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(56,189,248,0.08),transparent_50%)]" />

        <div className="relative flex h-full w-full flex-col items-center justify-center p-12">
          {floatingTasks.map((task, i) => (
            <motion.div
              key={task.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: [0, -8, 0] }}
              transition={{
                opacity: { delay: i * 0.15, duration: 0.4 },
                y: { delay: i * 0.15, duration: 3, repeat: Infinity, ease: "easeInOut" },
              }}
              className="absolute rounded-xl border border-slate-700/50 bg-slate-800/90 px-5 py-4 shadow-lg shadow-violet-900/20 backdrop-blur-sm"
              style={{
                top: `${20 + i * 18}%`,
                left: `${15 + i * 12}%`,
                rotate: `${(i - 1) * 3}deg`,
              }}
            >
              <p className="font-medium text-slate-100">{task.title}</p>
              <p className="text-sm text-slate-400">Due {task.due}</p>
            </motion.div>
          ))}

          <div className="z-10 my-8">
            <VoiceWaveform active bars={12} className="h-16" color="#7C3AED" />
          </div>

          <div className="absolute bottom-12 left-12 right-12 rounded-2xl border border-slate-700/50 bg-slate-800/80 p-6 backdrop-blur-sm">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-600/20">
                <Mic className="h-5 w-5 text-violet-400" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-100">Create tasks entirely by voice</h3>
                <p className="mt-1 text-sm text-slate-400">
                  Speak naturally and let AI turn your words into organized tasks instantly.
                </p>
                <div className="mt-3 flex flex-wrap gap-4 text-sm font-medium text-violet-400">
                  <span>Web app</span>
                  <span className="text-slate-600">·</span>
                  <span>Voice + typed commands</span>
                  <span className="text-slate-600">·</span>
                  <span>Early access</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
