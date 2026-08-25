"use client";

import { useEffect } from "react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-red-500/30 bg-red-500/10 p-8 text-center">
      <h2 className="text-lg font-semibold text-slate-100">This dashboard section could not load</h2>
      <p className="mt-2 text-sm text-slate-300">Please try again. Your saved tasks and account data are not changed by this display error.</p>
      <button type="button" onClick={() => reset()} className="mt-5 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500">
        Try again
      </button>
    </div>
  );
}
