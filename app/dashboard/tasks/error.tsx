"use client";

import { useEffect } from "react";

export default function TasksError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Keep the error boundary quiet in production while retaining a useful development trace.
    if (process.env.NODE_ENV === "development") console.error("Tasks page error", error);
  }, [error]);

  return (
    <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-8 text-center">
      <h2 className="text-lg font-semibold text-red-200">Tasks could not be displayed</h2>
      <p className="mt-2 text-sm text-red-300">Try loading this page again.</p>
      <button type="button" onClick={() => reset()} className="mt-4 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500">
        Try again
      </button>
    </div>
  );
}
