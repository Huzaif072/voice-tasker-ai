"use client";

import Link from "next/link";
import { Bell } from "lucide-react";

interface NotificationBellProps {
  count?: number;
}

export function NotificationBell({ count = 0 }: NotificationBellProps) {
  return (
    <Link
      href="/dashboard/notifications"
      className="relative rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
    >
      <Bell className="h-5 w-5" />
      {count > 0 ? (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-violet-600 text-[10px] font-bold text-white">
          {count > 9 ? "9+" : count}
        </span>
      ) : null}
    </Link>
  );
}
