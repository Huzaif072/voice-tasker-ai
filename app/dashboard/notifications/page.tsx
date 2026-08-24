"use client";

import { motion } from "framer-motion";
import { useNotifications } from "@/hooks/useNotifications";
import { formatRelativeDate } from "@/lib/utils/date";

export default function NotificationsPage() {
  const { data: notifications = [], isLoading } = useNotifications();

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <h2 className="mb-6 text-2xl font-bold text-slate-100">Notifications</h2>
      {isLoading ? (
        <p className="text-slate-400">Loading...</p>
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
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-slate-200">{n.title}</p>
                  <p className="mt-1 text-sm text-slate-400">{n.message}</p>
                </div>
                <span className="text-xs text-slate-500">
                  {formatRelativeDate(n.createdAt)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
