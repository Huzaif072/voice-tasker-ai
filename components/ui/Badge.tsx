import { cn } from "@/lib/utils/classnames";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "violet" | "blue" | "green" | "red" | "amber";
  className?: string;
}

const variants = {
  default: "bg-slate-700 text-slate-200",
  violet: "bg-violet-500/20 text-violet-300",
  blue: "bg-sky-400/10 text-sky-400",
  green: "bg-emerald-500/20 text-emerald-400",
  red: "bg-red-500/20 text-red-400",
  amber: "bg-amber-500/20 text-amber-400",
};

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-lg px-2 py-0.5 text-xs font-medium",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
