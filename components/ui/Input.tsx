"use client";

import { forwardRef, useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils/classnames";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  labelClassName?: string;
  error?: string;
  showToggle?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, labelClassName, error, type, showToggle, id, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
    const isPassword = type === "password" && showToggle;
    const inputType = isPassword && showPassword ? "text" : type;

    return (
      <div className="w-full">
        {label ? (
          <label htmlFor={inputId} className={cn("mb-2 block text-sm font-medium text-slate-700", labelClassName)}>
            {label}
          </label>
        ) : null}
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            type={inputType}
            className={cn(
              "w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-slate-900",
              "placeholder:text-slate-400 transition-colors",
              "focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20",
              error && "border-red-400 focus:border-red-400 focus:ring-red-400/20",
              isPassword && "pr-10",
              className
            )}
            {...props}
          />
          {isPassword ? (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          ) : null}
        </div>
        {error ? <p className="mt-1.5 text-sm text-red-500">{error}</p> : null}
      </div>
    );
  }
);
Input.displayName = "Input";
