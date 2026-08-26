"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Mic, LayoutDashboard, CheckSquare, Volume2, BarChart3, Activity, Settings, LogOut, X } from "lucide-react";
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
      {open ? <button type="button" aria-label="Close navigation" className="fixed inset-0 z-30 bg-slate-950/75 backdrop-blur-sm md:hidden" onClick={onClose} /> : null}
      <aside className={cn(
        "fixed left-0 top-0 z-40 flex h-screen w-60 flex-col border-r border-slate-800/90 bg-slate-950/95 shadow-2xl shadow-slate-950/30 transition-transform duration-200 md:translate-x-0",
        open ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex h-16 items-center justify-between border-b border-slate-800/80 px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600 shadow-lg shadow-violet-600/25">
              <Mic className="h-4 w-4 text-white" />
            </div>
            <div>
              <span className="block text-sm font-bold text-slate-100">VoiceTasker AI</span>
              <span className="block text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500">Workspace</span>
            </div>
          </div>
          <button type="button" aria-label="Close navigation" onClick={onClose} className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-800 hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 md:hidden">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-5" aria-label="Dashboard navigation">
          <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600">Manage</p>
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500",
                  active
                    ? "bg-violet-600/20 text-violet-200 shadow-sm shadow-violet-950/20"
                    : "text-slate-400 hover:bg-slate-800/80 hover:text-slate-100"
                )}
              >
                <Icon className={cn("h-5 w-5 transition-colors", active ? "text-violet-300" : "text-slate-500 group-hover:text-slate-300")} />
                {label}
                {active ? <span className="ml-auto h-1.5 w-1.5 rounded-full bg-violet-400" aria-hidden="true" /> : null}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-slate-800/80 p-4">
          <div className="rounded-xl border border-slate-800/80 bg-slate-900/70 p-3">
            <div className="flex items-center gap-3">
              <Avatar name={userName} size="sm" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-200">{userName}</p>
                <p className="truncate text-xs text-slate-500">Pro plan</p>
              </div>
            </div>
          </div>
          <button type="button" onClick={onLogout} className="mt-3 flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500">
            <LogOut className="h-5 w-5" />
            Log out
          </button>
        </div>
      </aside>
    </>
  );
}
