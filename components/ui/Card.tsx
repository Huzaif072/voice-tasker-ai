import { cn } from "@/lib/utils/classnames";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  glow?: boolean;
}

export function Card({ children, className, hover, glow }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-slate-700/50 bg-slate-800/80 p-6 backdrop-blur-sm",
        hover && "transition-all duration-200 hover:border-violet-500/30 hover:shadow-lg hover:shadow-violet-600/10",
        glow && "shadow-lg shadow-violet-600/20",
        className
      )}
    >
      {children}
    </div>
  );
}
