"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Mic,
  LayoutDashboard,
  CheckSquare,
  Volume2,
  BarChart3,
  Activity,
  Settings,
  LogOut,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils/classnames";
import { Avatar } from "@/components/ui/Avatar";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/dashboard/voice", label: "Voice", icon: Volume2 },
  { href: "/dashboard/summary", label: "Summary", icon: BarChart3 },
  { href: "/dashboard/analytics", label: "Analytics", icon: Activity },
  { href: "/dashboard/security", label: "Security", icon: Settings },
];

interface SidebarProps {
  userName?: string;
  onLogout?: () => void | Promise<void>;
  open?: boolean;
  onClose?: () => void;
}

export function Sidebar({ userName = "User", onLogout, open = false, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {open ? <button type="button" aria-label="Close navigation" className="fixed inset-0 z-30 bg-slate-950/70 md:hidden" onClick={onClose} /> : null}
      <aside className={cn(
        "fixed left-0 top-0 z-40 flex h-screen w-60 flex-col border-r border-slate-800 bg-slate-900 transition-transform duration-200 md:translate-x-0",
        open ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex h-16 items-center justify-between border-b border-slate-800 px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600">
              <Mic className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-slate-100">VoiceTasker AI</span>
          </div>
          <button type="button" aria-label="Close navigation" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-100 md:hidden">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 p-4" aria-label="Dashboard navigation">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500",
                  active
                    ? "bg-violet-600/20 text-violet-300"
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                )}
              >
                <Icon className="h-5 w-5" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-slate-800 p-4">
          <div className="flex items-center gap-3">
            <Avatar name={userName} size="sm" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-200">{userName}</p>
              <p className="truncate text-xs text-slate-500">Pro plan</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="mt-4 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
          >
            <LogOut className="h-5 w-5" />
            Log out
          </button>
        </div>
      </aside>
    </>
  );
}
