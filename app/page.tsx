import Link from "next/link";
import { Mic } from "lucide-react";
import { LandingNav } from "@/components/landing/LandingNav";
import { HeroSection } from "@/components/landing/HeroSection";
import { FeaturesGrid } from "@/components/landing/FeaturesGrid";
import { CTASection } from "@/components/landing/CTASection";
import { PricingSection } from "@/components/landing/PricingSection";
import { FAQSection } from "@/components/landing/FAQSection";

const steps = [
  { num: "01", title: "Speak or type", desc: "Say what you need naturally, or enter the same kind of command when typing is easier." },
  { num: "02", title: "Review the intent", desc: "VoiceTasker extracts the task, priority, deadline, context, and next steps for you to review." },
  { num: "03", title: "Move work forward", desc: "Create, decompose, delegate, prioritize, and keep your plan moving from one workspace." },
];

const useCases = [
  { title: "Busy Professionals", desc: "Capture ideas between meetings without breaking flow." },
  { title: "Multitasking Users", desc: "Plan the next step while your attention is somewhere else." },
  { title: "Drivers", desc: "Stay productive hands-free while keeping your attention on the road." },
  { title: "Students", desc: "Dictate assignments, study plans, and deadlines on the go." },
  { title: "Accessibility-first workflows", desc: "Manage tasks without depending on a keyboard or complex screens." },
];

export default function LandingPage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "VoiceTasker AI",
    applicationCategory: "ProductivityApplication",
    operatingSystem: "Web",
    description: "Turn natural voice or typed commands into organized tasks, priorities, reminders, delegation, and daily briefings.",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  };

  return (
    <div className="min-h-screen bg-slate-900">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-violet-600 focus:px-4 focus:py-3 focus:text-white"
      >
        Skip to main content
      </a>
      <LandingNav />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />

      <main id="main-content" aria-label="VoiceTasker AI product overview">
        <HeroSection />

        {/* Product promise */}
        <section className="border-y border-slate-800 py-8">
          <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-x-8 gap-y-3 px-6 text-center text-sm text-slate-400" aria-label="VoiceTasker AI product principles">
            <span>Speak naturally</span>
            <span aria-hidden="true" className="hidden text-violet-500 sm:inline">•</span>
            <span>Turn intent into action</span>
            <span aria-hidden="true" className="hidden text-violet-500 sm:inline">•</span>
            <span>Stay aware of context</span>
            <span aria-hidden="true" className="hidden text-violet-500 sm:inline">•</span>
            <span>Keep your priorities moving</span>
          </div>
        </section>

        <FeaturesGrid />

        {/* How it works */}
        <section id="how-it-works" aria-labelledby="how-it-works-heading" className="scroll-mt-24 px-6 py-20 lg:px-8 md:py-24">
          <div className="mx-auto max-w-7xl">
            <h2 id="how-it-works-heading" className="text-center text-3xl font-bold text-slate-50">From spoken thought to clear next step</h2>
            <div className="mt-16 grid gap-8 md:grid-cols-3">
              {steps.map((step, i) => (
                <div key={step.num} className="relative text-center">
                  {i < steps.length - 1 ? (
                    <div className="absolute left-[calc(50%+40px)] top-8 hidden h-0.5 w-[calc(100%-80px)] bg-gradient-to-r from-violet-600 to-violet-600/0 md:block" />
                  ) : null}
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-600/20 text-2xl font-bold text-violet-400">
                    {step.num}
                  </div>
                  <h3 className="mt-4 text-xl font-semibold text-slate-100">{step.title}</h3>
                  <p className="mt-2 text-slate-400">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Use cases */}
        <section id="use-cases" aria-labelledby="use-cases-heading" className="scroll-mt-24 px-6 py-20 lg:px-8 md:py-24">
          <div className="mx-auto max-w-7xl">
            <h2 id="use-cases-heading" className="text-center text-3xl font-bold text-slate-50">Built for everyone</h2>
            <div className="mt-12 grid gap-6 sm:grid-cols-2">
              {useCases.map((uc) => (
                <div
                  key={uc.title}
                  className="group rounded-xl border border-slate-700/50 bg-slate-800/50 p-6 transition-all hover:border-violet-500/50 hover:shadow-lg hover:shadow-violet-600/10"
                  style={{
                    backgroundImage:
                      "linear-gradient(135deg, transparent 0%, rgba(124,58,237,0.05) 100%)",
                  }}
                >
                  <h3 className="text-lg font-semibold text-slate-100">{uc.title}</h3>
                  <p className="mt-2 text-slate-400">{uc.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <PricingSection />
        <FAQSection />
        <CTASection />
      </main>

      <footer className="border-t border-slate-800 px-6 py-12 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-8 md:flex-row md:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Mic className="h-5 w-5 text-violet-400" />
                <span className="font-bold text-slate-100">VoiceTasker AI</span>
              </div>
              <p className="mt-2 text-sm text-slate-500">Your tasks, spoken into existence.</p>
            </div>
            <div className="flex gap-12 text-sm text-slate-400">
              <div className="space-y-2">
                <p className="font-medium text-slate-300">Product</p>
                <a href="#features" className="block hover:text-slate-200">
                  Features
                </a>
              </div>
              <div className="space-y-2">
                <p className="font-medium text-slate-300">Legal</p>
                <Link href="/privacy" className="block hover:text-slate-200">
                  Privacy
                </Link>
                <Link href="/terms" className="block hover:text-slate-200">
                  Terms
                </Link>
              </div>
              <div className="space-y-2">
                <p className="font-medium text-slate-300">Contact</p>
                <a href="mailto:hello@voicetasker.ai" className="block hover:text-slate-200">
                  hello@voicetasker.ai
                </a>
              </div>
            </div>
          </div>
          <p className="mt-8 text-center text-xs text-slate-600">
            © {new Date().getFullYear()} VoiceTasker AI. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
