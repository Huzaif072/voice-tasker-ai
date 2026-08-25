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
    <div className="flex flex-wrap gap-2">
      {filters.map((filter) => (
        <button
          key={filter}
          onClick={() => onChange(filter)}
          className={cn(
            "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
            active === filter
              ? "bg-violet-600 text-white"
              : "bg-slate-800 text-slate-400 hover:text-slate-200"
          )}
        >
          {filter}
        </button>
      ))}
    </div>
  );
}
