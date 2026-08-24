"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils/classnames";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "outline";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

const variants = {
  primary:
    "bg-violet-600 text-white hover:bg-violet-500 shadow-lg shadow-violet-600/30 hover:shadow-violet-600/50 focus:ring-violet-500",
  secondary:
    "bg-slate-800 text-slate-100 hover:bg-slate-700 border border-slate-700 focus:ring-violet-500",
  ghost:
    "bg-transparent text-slate-100 border border-slate-600 hover:border-violet-500 hover:text-violet-300 focus:ring-violet-500",
  outline:
    "bg-transparent text-violet-400 border border-violet-500/50 hover:bg-violet-500/10 focus:ring-violet-500",
};

const sizes = {
  sm: "px-3 py-1.5 text-sm rounded-lg",
  md: "px-5 py-2.5 text-sm rounded-xl",
  lg: "px-8 py-3.5 text-base rounded-xl",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", loading, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 font-medium transition-all duration-200",
        "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {loading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : null}
      {children}
    </button>
  )
);
Button.displayName = "Button";
