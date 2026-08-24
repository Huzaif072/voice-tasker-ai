"use client";

import { Search } from "lucide-react";
import { NotificationBell } from "./NotificationBell";

interface HeaderProps {
  title?: string;
  unreadCount?: number;
}

export function Header({ title, unreadCount = 0 }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-800 bg-slate-900/80 px-8 backdrop-blur-md">
      <h1 className="text-xl font-semibold text-slate-100">{title ?? "Dashboard"}</h1>

      <div className="flex items-center gap-4">
        <div className="relative hidden sm:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="search"
            placeholder="Search tasks..."
            className="w-64 rounded-lg border border-slate-700 bg-slate-800 py-2 pl-10 pr-4 text-sm text-slate-200 placeholder:text-slate-500 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
          />
        </div>
        <NotificationBell count={unreadCount} />
      </div>
    </header>
  );
}
