"use client";

import { Menu, Search } from "lucide-react";
import { NotificationBell } from "./NotificationBell";
import { useNotifications } from "@/hooks/useNotifications";
import { useDashboardSearch } from "@/hooks/useDashboardSearch";

interface HeaderProps {
  title?: string;
  onMenuOpen?: () => void;
}

export function Header({ title, onMenuOpen }: HeaderProps) {
  const { search, setSearch } = useDashboardSearch();
  const { data: notifications = [] } = useNotifications();
  const unreadCount = notifications.filter((notification) => !notification.read).length;
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-800 bg-slate-900/80 px-4 backdrop-blur-md md:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <button type="button" onClick={onMenuOpen} aria-label="Open navigation" className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 md:hidden">
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="truncate text-xl font-semibold text-slate-100">{title ?? "Dashboard"}</h1>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        <div className="relative hidden sm:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search tasks..."
            aria-label="Search tasks"
            className="w-40 rounded-lg border border-slate-700 bg-slate-800 py-2 pl-10 pr-4 text-sm text-slate-200 placeholder:text-slate-500 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 md:w-64"
          />
        </div>
        <NotificationBell count={unreadCount} />
      </div>
    </header>
  );
}
