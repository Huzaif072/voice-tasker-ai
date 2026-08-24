"use client";

import { motion } from "framer-motion";
import {
  Mic,
  Brain,
  MessageSquare,
  Bell,
  Users,
  Radio,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
import { Card } from "@/components/ui/Card";

const features = [
  {
    icon: Mic,
    title: "Voice-First Task Management",
    description: "Create, update, complete, and delete tasks naturally by voice or from the clean task view.",
    example: "Create a task to call the client tomorrow.",
  },
  {
    icon: MessageSquare,
    title: "Conversational Task Queries",
    description: "Ask what is urgent, overdue, or due this afternoon and get a direct answer about your plan.",
    example: "What needs my attention today?",
  },
  {
    icon: Brain,
    title: "AI Task Decomposition",
    description: "Turn one vague request into an actionable checklist with suggested priorities and deadlines.",
    example: "Break the product launch into steps.",
  },
  {
    icon: Bell,
    title: "Context-Aware Reminders",
    description: "Get reminders based on time, location, calendar context, and the moment a task matters.",
    example: "Remind me when I get to the office.",
  },
  {
    icon: Users,
    title: "Voice Delegation",
    description: "Assign work to a teammate and send the task by email without stopping to write a message.",
    example: "Ask Mark to review the budget.",
  },
  {
    icon: Radio,
    title: "Daily and Weekly Briefings",
    description: "Start the day or review the week with a concise voice summary of priorities and progress.",
    example: "Give me my morning briefing.",
  },
  {
    icon: RefreshCw,
    title: "Realtime Task Sync",
    description: "Keep task lists and notifications synchronized as changes happen across the workspace.",
    example: "Show me the latest task updates.",
  },
  {
    icon: TrendingUp,
    title: "Behavior-Driven Prioritization",
    description: "Use patterns in your work to make prioritization more helpful and keep important tasks visible.",
    example: "Which priority should I tackle next?",
  },
];

export function FeaturesGrid() {
  return (
    <section id="features" className="scroll-mt-24 px-6 py-20 lg:px-8 xl:py-24">
      <div className="mx-auto max-w-7xl">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-slate-50 lg:text-4xl">
            Everything you need to move work forward by voice
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-400">
            Capture tasks, ask about priorities, break down complex work, coordinate with teammates,
            receive contextual reminders, and review your day through natural voice conversations.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:mt-14 lg:grid-cols-2 xl:mt-16 xl:grid-cols-4">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.04, duration: 0.2 }}
            >
              <Card hover className="h-full">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-violet-600/20">
                  <feature.icon className="h-6 w-6 text-violet-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-100">{feature.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">{feature.description}</p>
                <p className="mt-5 border-l border-violet-500/50 pl-3 text-xs italic leading-5 text-slate-500">
                  “{feature.example}”
                </p>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
