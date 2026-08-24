import Link from "next/link";
import { ArrowLeft, Mic } from "lucide-react";

interface LegalPageProps {
  title: string;
  lastUpdated: string;
  intro: string;
  children: React.ReactNode;
}

export function LegalPage({ title, lastUpdated, intro, children }: LegalPageProps) {
  return (
    <main className="min-h-screen bg-slate-900 px-6 py-10 text-slate-100 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-white">
          <ArrowLeft className="h-4 w-4" />
          Back to VoiceTasker AI
        </Link>

        <div className="mt-12 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600">
            <Mic className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-bold">VoiceTasker AI</span>
        </div>

        <header className="mt-10 border-b border-slate-800 pb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-violet-400">
            Development draft
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-50">{title}</h1>
          <p className="mt-4 text-lg leading-8 text-slate-300">{intro}</p>
          <p className="mt-4 text-sm text-slate-500">Last updated: {lastUpdated}</p>
        </header>

        <div className="prose prose-invert mt-10 max-w-none prose-headings:text-slate-100 prose-p:text-slate-300 prose-li:text-slate-300 prose-strong:text-slate-100">
          {children}
        </div>

        <p className="mt-12 border-t border-slate-800 pt-6 text-sm leading-6 text-slate-500">
          This development draft should be reviewed and adapted to the final product, data practices,
          jurisdiction, and business terms before public launch.
        </p>
      </div>
    </main>
  );
}
