import Link from "next/link";
import { Check, Clock3 } from "lucide-react";
import { Button } from "@/components/ui/Button";

const includedFeatures = [
  "Voice and typed task capture",
  "AI intent parsing and priorities",
  "Task lists, deadlines, and subtasks",
  "Daily and weekly summaries",
];

export function PricingSection() {
  return (
    <section id="pricing" className="scroll-mt-24 px-6 py-20 lg:px-8 xl:py-24">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-violet-400">
            Early access
          </p>
          <h2 className="mt-3 text-3xl font-bold text-slate-50 lg:text-4xl">
            Start organizing your day by voice.
          </h2>
          <p className="mt-4 text-lg text-slate-400">
            The MVP is available for early users while we build the next generation of voice-first productivity.
          </p>
        </div>

        <div className="mx-auto mt-12 max-w-xl rounded-2xl border border-violet-500/50 bg-gradient-to-b from-violet-500/15 to-slate-800/80 p-8 shadow-2xl shadow-violet-950/30">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-lg font-semibold text-slate-100">Early Access</p>
              <p className="mt-2 text-sm text-slate-400">
                Everything currently available in the MVP.
              </p>
            </div>
            <span className="rounded-full bg-violet-500/15 px-3 py-1 text-xs font-medium text-violet-300">
              Available now
            </span>
          </div>

          <div className="mt-8 flex items-end gap-2">
            <span className="text-5xl font-bold tracking-tight text-slate-50">Free</span>
            <span className="pb-1 text-sm text-slate-400">during early access</span>
          </div>

          <div className="mt-8 space-y-3">
            {includedFeatures.map((feature) => (
              <div key={feature} className="flex items-center gap-3 text-sm text-slate-300">
                <Check className="h-4 w-4 shrink-0 text-violet-400" />
                <span>{feature}</span>
              </div>
            ))}
          </div>

          <Link href="/signup" className="mt-8 block">
            <Button size="lg" className="w-full">
              Join early access
            </Button>
          </Link>

          <p className="mt-4 flex items-center justify-center gap-2 text-center text-xs text-slate-500">
            <Clock3 className="h-3.5 w-3.5" />
            Paid plans and final limits will be announced before launch.
          </p>
        </div>
      </div>
    </section>
  );
}
