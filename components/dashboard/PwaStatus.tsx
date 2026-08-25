"use client";

import { usePwaRuntime } from "@/hooks/usePwaRuntime";

export function PwaStatus() {
  const { online, canInstall, install } = usePwaRuntime();
  if (online && !canInstall) return null;
  return <div className="fixed bottom-4 left-4 z-50 flex items-center gap-3 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-200 shadow-lg" role="status">{online ? <span>VoiceTasker can be installed</span> : <span>Offline. Task changes will sync when you reconnect.</span>}{online && canInstall ? <button type="button" onClick={() => void install()} className="rounded-md bg-violet-600 px-2 py-1 text-white hover:bg-violet-500">Install</button> : null}</div>;
}
