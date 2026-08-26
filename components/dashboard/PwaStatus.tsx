"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { usePwaRuntime } from "@/hooks/usePwaRuntime";

export function PwaStatus() {
  const { online, canInstall, install, pendingMutations, hasConflict, hasFailedReplay, dismissConflict, dismissFailedReplay } = usePwaRuntime();
  const [installDismissed, setInstallDismissed] = useState(false);
  const showInstall = online && canInstall && !installDismissed;
  if (!showInstall && online && pendingMutations === 0 && !hasConflict && !hasFailedReplay) return null;
  return <div className="fixed bottom-20 right-4 z-50 max-w-sm space-y-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-200 shadow-lg sm:bottom-4 md:bottom-8 md:right-32" role="status">
    {showInstall ? (
      <div className="flex items-center gap-3">
        <span className="flex-1">VoiceTasker can be installed</span>
        <button type="button" onClick={() => void install()} className="rounded-md bg-violet-600 px-2 py-1 text-white hover:bg-violet-500">Install</button>
        <button type="button" onClick={() => setInstallDismissed(true)} className="flex min-h-8 min-w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-700 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400" aria-label="Dismiss install message" title="Dismiss install message">
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
