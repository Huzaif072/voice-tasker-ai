"use client";

import { motion } from "framer-motion";
import { useMarkNotificationRead, useNotifications } from "@/hooks/useNotifications";
import { formatRelativeDate } from "@/lib/utils/date";

export default function NotificationsPage() {
  const notificationsQuery = useNotifications();
  const { data: notifications = [], isLoading, isError, refetch } = notificationsQuery;
  const markRead = useMarkNotificationRead();

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <h2 className="mb-6 text-2xl font-bold text-slate-100">Notifications</h2>
      {isLoading ? (
        <p className="text-slate-400" role="status">Loading notifications...</p>
      ) : isError ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-center">
          <p className="text-sm text-red-300" role="alert">We couldn’t load your notifications.</p>
          <button type="button" onClick={() => refetch()} className="mt-3 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500">
            Try again
          </button>
        </div>
      ) : notifications.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-700 py-12 text-center text-slate-400">
          No notifications yet.
        </p>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <div
              key={n._id}
              className={`rounded-xl border p-4 ${
                n.read
                  ? "border-slate-700/50 bg-slate-800/30"
                  : "border-violet-500/30 bg-violet-500/5"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium text-slate-200">{n.title}</p>
                  <p className="mt-1 text-sm text-slate-400">{n.message}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <span className="text-xs text-slate-500">
                    {formatRelativeDate(n.createdAt)}
                  </span>
                  {!n.read && n._id ? (
                    <button
                      type="button"
                      onClick={() => markRead.mutate(n._id!)}
                      disabled={markRead.isPending}
                      className="text-xs font-medium text-violet-300 hover:text-violet-200 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Mark as read
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {markRead.isError ? (
        <p className="mt-4 text-sm text-red-400" role="alert">Unable to mark the notification as read. Please try again.</p>
      ) : null}
    </motion.div>
  );
}
