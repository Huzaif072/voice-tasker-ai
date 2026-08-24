"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils/classnames";

interface TooltipProps {
  content: string;
  children: ReactNode;
  className?: string;
}

export function Tooltip({ content, children, className }: TooltipProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible ? (
        <div
          className={cn(
            "absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 whitespace-nowrap",
            "rounded-lg bg-slate-800 px-3 py-1.5 text-xs text-slate-200 shadow-lg border border-slate-700",
            className
          )}
        >
          {content}
        </div>
      ) : null}
    </div>
  );
}
