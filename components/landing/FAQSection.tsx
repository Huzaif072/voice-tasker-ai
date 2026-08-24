"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    question: "What is VoiceTasker AI?",
    answer:
      "VoiceTasker AI is a voice-first task management app. You can speak naturally to create and manage tasks, ask questions about your plan, break complex work into steps, delegate tasks, and receive useful briefings.",
  },
  {
    question: "Can I create tasks without typing?",
    answer:
      "Yes. Use the microphone to submit a voice command, or type the same natural-language command when you prefer. VoiceTasker understands the intent and can extract task details such as priority and due date.",
  },
  {
    question: "What kinds of questions can I ask?",
    answer:
      "You can ask conversational questions about your tasks, such as what is urgent, what is due today, or which work needs your attention next. The assistant is designed to turn those questions into practical task guidance.",
  },
  {
    question: "How does AI task decomposition work?",
    answer:
      "When a task is broad or ambiguous, the assistant can turn it into a focused checklist of smaller, actionable subtasks. You can review the suggested steps before applying them to your task.",
  },
  {
    question: "Can I delegate a task by voice?",
    answer:
      "Yes. VoiceTasker is designed to let you identify a task and teammate naturally, then send the assignment through the delegation workflow. You can review the recipient and task details before sending.",
  },
  {
    question: "How does VoiceTasker handle voice data?",
    answer:
      "Voice commands may be sent to a speech-to-text service for transcription, and the resulting transcript and parsed intent may be stored with your voice-session history. Review the Privacy Policy for the current development data flow and retention details.",
  },
  {
    question: "Is VoiceTasker AI free during early access?",
    answer:
      "The development version is currently presented as free during early access. Paid plans, usage limits, and final billing terms will be communicated before any paid service is activated.",
  },
];

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" className="scroll-mt-24 px-6 py-20 lg:px-8 xl:py-24">
      <div className="mx-auto max-w-3xl">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-violet-400">
            Questions, answered
          </p>
          <h2 className="mt-3 text-3xl font-bold text-slate-50 lg:text-4xl">
            Everything you need to know
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-400">
            Learn how the voice-first workflow, AI planning, privacy, and early access fit together.
          </p>
        </div>

        <div className="mt-12 space-y-3">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div key={faq.question} className="overflow-hidden rounded-xl border border-slate-700/60 bg-slate-800/50">
                <button
                  type="button"
                  id={`faq-question-${index}`}
                  aria-expanded={isOpen}
                  aria-controls={`faq-answer-${index}`}
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="flex w-full items-center justify-between gap-6 px-5 py-5 text-left text-sm font-semibold text-slate-100 transition-colors hover:bg-slate-800"
                >
                  <span>{faq.question}</span>
                  <motion.span animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                    <ChevronDown aria-hidden="true" className="h-5 w-5 shrink-0 text-violet-400" />
                  </motion.span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen ? (
                    <motion.div
                      id={`faq-answer-${index}`}
                      role="region"
                      aria-labelledby={`faq-question-${index}`}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                    >
                      <p className="border-t border-slate-700/60 px-5 pb-5 pt-4 text-sm leading-6 text-slate-400">
                        {faq.answer}
                      </p>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
