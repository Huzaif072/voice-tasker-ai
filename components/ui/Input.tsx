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
  ({ className, label, labelClassName, error, type, showToggle, id, "aria-describedby": ariaDescribedBy, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
    const errorId = error && inputId ? `${inputId}-error` : undefined;
    const describedBy = [ariaDescribedBy, errorId].filter(Boolean).join(" ") || undefined;
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
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
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
              onClick={() => setShowPassword((visible) => !visible)}
              onTouchEnd={(event) => {
                event.preventDefault();
                setShowPassword((visible) => !visible);
              }}
              className="absolute right-1 top-1/2 z-10 flex min-h-11 min-w-11 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 touch-manipulation hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/60"
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              aria-controls={inputId}
            >
              {showPassword ? <EyeOff aria-hidden="true" className="h-4 w-4" /> : <Eye aria-hidden="true" className="h-4 w-4" />}
            </button>
          ) : null}
        </div>
        {error ? <p id={errorId} className="mt-1.5 text-sm text-red-500" role="alert">{error}</p> : null}
      </div>
    );
  }
);
Input.displayName = "Input";
