"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { usePwaRuntime } from "@/hooks/usePwaRuntime";

export function PwaStatus() {
  const { online, canInstall, install, pendingMutations, hasConflict, hasFailedReplay, dismissConflict, dismissFailedReplay } = usePwaRuntime();
  const [installDismissed, setInstallDismissed] = useState(false);
  const showInstall = online && canInstall && !installDismissed;
  if (!showInstall && online && pendingMutations === 0 && !hasConflict && !hasFailedReplay) return null;
  return <div className="fixed bottom-[calc(6.5rem+env(safe-area-inset-bottom))] right-4 z-50 w-[calc(100vw-2rem)] max-w-sm space-y-2 rounded-xl border border-slate-700/80 bg-slate-800/95 px-3 py-2.5 text-xs text-slate-200 shadow-2xl shadow-slate-950/30 backdrop-blur-md sm:bottom-20 sm:right-5 md:bottom-24 md:right-8 md:w-auto" role="status">
    {showInstall ? (
      <div className="flex items-center gap-2.5">
        <span className="min-w-0 flex-1 font-medium leading-5">VoiceTasker can be installed</span>
        <button type="button" onClick={() => void install()} className="shrink-0 rounded-lg bg-violet-600 px-3 py-1.5 font-medium text-white shadow-sm shadow-violet-950/30 transition-colors hover:bg-violet-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-300">Install</button>
        <button type="button" onClick={() => setInstallDismissed(true)} className="flex min-h-8 min-w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-700 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400" aria-label="Dismiss install message" title="Dismiss install message">
          <X aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>
    ) : null}
    {!online ? <div>Offline. Task changes will sync when you reconnect.</div> : null}
    {pendingMutations > 0 ? <div className="text-amber-300">{pendingMutations} queued</div> : null}
    {hasConflict ? <div className="flex items-center justify-between gap-3 text-amber-200"><span>A task changed elsewhere; review it before retrying.</span><button type="button" onClick={dismissConflict} className="underline">Dismiss</button></div> : null}
    {hasFailedReplay ? <div className="flex items-center justify-between gap-3 text-red-300"><span>An offline change could not be replayed.</span><button type="button" onClick={dismissFailedReplay} className="underline">Dismiss</button></div> : null}
  </div>;
}
