"use client";

import { usePwaRuntime } from "@/hooks/usePwaRuntime";

export function PwaStatus() {
  const { online, canInstall, install, pendingMutations, hasConflict, hasFailedReplay, dismissConflict, dismissFailedReplay } = usePwaRuntime();
  if (online && !canInstall && pendingMutations === 0 && !hasConflict && !hasFailedReplay) return null;
  return <div className="fixed bottom-20 left-4 z-50 max-w-sm space-y-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-200 shadow-lg sm:bottom-4 md:bottom-8 md:left-64" role="status">
    <div className="flex items-center gap-3">{online ? <span>{canInstall ? "VoiceTasker can be installed" : "Connected"}</span> : <span>Offline. Task changes will sync when you reconnect.</span>}{pendingMutations > 0 ? <span className="text-amber-300">{pendingMutations} queued</span> : null}{online && canInstall ? <button type="button" onClick={() => void install()} className="rounded-md bg-violet-600 px-2 py-1 text-white hover:bg-violet-500">Install</button> : null}</div>
    {hasConflict ? <div className="flex items-center justify-between gap-3 text-amber-200"><span>A task changed elsewhere; review it before retrying.</span><button type="button" onClick={dismissConflict} className="underline">Dismiss</button></div> : null}
    {hasFailedReplay ? <div className="flex items-center justify-between gap-3 text-red-300"><span>An offline change could not be replayed.</span><button type="button" onClick={dismissFailedReplay} className="underline">Dismiss</button></div> : null}
  </div>;
}
