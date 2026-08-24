"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Mic,
  LayoutDashboard,
  CheckSquare,
  Volume2,
  BarChart3,
  Settings,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils/classnames";
import { Avatar } from "@/components/ui/Avatar";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/dashboard/voice", label: "Voice", icon: Volume2 },
  { href: "/dashboard/summary", label: "Summary", icon: BarChart3 },
  { href: "/dashboard/security", label: "Security", icon: Settings },
];

interface SidebarProps {
  userName?: string;
  onLogout?: () => void | Promise<void>;
}

export function Sidebar({ userName = "User", onLogout }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-60 flex-col border-r border-slate-800 bg-slate-900">
      <div className="flex h-16 items-center gap-2 border-b border-slate-800 px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600">
          <Mic className="h-4 w-4 text-white" />
        </div>
        <span className="font-bold text-slate-100">VoiceTasker AI</span>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
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
          className="mt-4 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
        >
          <LogOut className="h-5 w-5" />
          Log out
        </button>
      </div>
    </aside>
  );
}
