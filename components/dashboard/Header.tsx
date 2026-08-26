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
    <header className="sticky top-0 z-30 flex min-h-16 items-center gap-3 border-b border-slate-800/80 bg-slate-900/85 px-4 backdrop-blur-xl md:px-8">
      <div className="flex min-w-0 flex-1 items-center gap-2 md:gap-3">
        <button type="button" onClick={onMenuOpen} aria-label="Open navigation" className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 md:hidden">
          <Menu className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <p className="hidden text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-400/80 md:block">Workspace</p>
          <h1 className="truncate text-lg font-semibold text-slate-100 md:text-xl">{title ?? "Dashboard"}</h1>
        </div>
      </div>

      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <div className="relative w-28 shrink-0 sm:w-44 md:w-64">
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search tasks..."
            aria-label="Search tasks"
            className="min-h-10 w-full rounded-xl border border-slate-700/80 bg-slate-800/80 py-2 pl-9 pr-3 text-sm text-slate-200 placeholder:text-slate-500 transition-colors focus:border-violet-500 focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
          />
        </div>
        <NotificationBell count={unreadCount} />
      </div>
    </header>
  );
}
