"use client";

import { cn } from "@/lib/utils/classnames";

const filters = ["All", "Active", "Completed", "High Priority", "Assigned to me"] as const;
export type TaskFilter = (typeof filters)[number];

interface TaskFiltersProps {
  active: TaskFilter;
  onChange: (filter: TaskFilter) => void;
}

export function TaskFilters({ active, onChange }: TaskFiltersProps) {
  return (
    <div className="overflow-x-auto pb-1">
      <div className="inline-flex min-w-max gap-1 rounded-xl border border-slate-700/70 bg-slate-800/45 p-1" role="group" aria-label="Task filters">
        {filters.map((filter) => (
          <button
            key={filter}
            type="button"
            onClick={() => onChange(filter)}
            aria-pressed={active === filter}
            className={cn(
              "min-h-10 rounded-lg px-3 py-2 text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 sm:text-sm",
              active === filter
                ? "bg-violet-600 text-white shadow-md shadow-violet-600/20"
                : "text-slate-400 hover:bg-slate-700/70 hover:text-slate-200"
            )}
          >
            {filter}
          </button>
        ))}
      </div>
    </div>
  );
}
