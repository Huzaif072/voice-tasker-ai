"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, PlayCircle, Mic } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { VoiceWaveform } from "@/components/voice/VoiceWaveform";

export function HeroSection() {
  return (
    <section aria-labelledby="hero-heading" className="relative overflow-hidden px-6 pb-24 pt-32 lg:px-8">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute left-1/2 top-0 h-[600px] w-[800px] -translate-x-1/2 rounded-full bg-violet-600/20 blur-[120px]" />
        <div className="absolute right-0 top-1/3 h-[400px] w-[400px] rounded-full bg-sky-400/10 blur-[100px]" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(#F8FAFC 1px, transparent 1px), linear-gradient(90deg, #F8FAFC 1px, transparent 1px)`,
            backgroundSize: "48px 48px",
          }}
        />
      </div>

      <div className="relative mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1.5 text-sm text-violet-300">
            <Mic className="h-4 w-4" />
            Voice-first task management for busy days
          </p>
          <h1 id="hero-heading" className="text-5xl font-bold leading-tight tracking-tight text-slate-50 lg:text-6xl xl:text-7xl">
            Manage your day{" "}
            <span className="bg-gradient-to-r from-violet-400 to-sky-400 bg-clip-text text-transparent">
              by voice.
            </span>
          </h1>
          <p className="mt-6 max-w-lg text-lg text-slate-400">
            Speak a task naturally and let VoiceTasker understand the intent, suggest the priority,
            set the deadline, and keep your plan moving.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link href="/signup">
              <Button size="lg">
                Start creating tasks
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
            <a href="#how-it-works">
              <Button size="lg" variant="ghost">
                <PlayCircle className="h-5 w-5" />
                See how it works
              </Button>
            </a>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="relative"
        >
          <div className="rounded-2xl border border-slate-700/50 bg-slate-800/80 p-6 shadow-2xl shadow-violet-600/10 backdrop-blur-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-600 shadow-lg shadow-violet-600/40">
                <Mic className="h-6 w-6 text-white" />
              </div>
              <VoiceWaveform active bars={10} className="h-10 flex-1" />
            </div>
            <div className="rounded-xl bg-slate-900/80 p-4">
              <p className="text-sm text-slate-400">Example voice workflow</p>
              <p className="mt-1 text-slate-200">
                &quot;Prepare the client presentation for Friday and break it into clear steps...&quot;
              </p>
            </div>
            <div className="mt-4 rounded-xl border border-violet-500/30 bg-violet-500/10 p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-violet-400">
                Parsed Intent
              </p>
              <p className="mt-1 font-medium text-slate-200">Create task: Client presentation</p>
              <p className="text-sm text-slate-400">Suggested priority · Due Friday · 4 subtasks</p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
