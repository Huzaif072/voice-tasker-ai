"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useAssignmentResponse, useMarkAllNotificationsRead, useMarkNotificationRead, useNotifications } from "@/hooks/useNotifications";
import { formatRelativeDate } from "@/lib/utils/date";

type NotificationFilter = "all" | "unread" | "task_reminder" | "task_delegated" | "system";

const filters: Array<{ value: NotificationFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "unread", label: "Unread" },
  { value: "task_reminder", label: "Reminders" },
  { value: "task_delegated", label: "Delegations" },
  { value: "system", label: "System" },
];

export default function NotificationsPage() {
  const [filter, setFilter] = useState<NotificationFilter>("all");
  const notificationsQuery = useNotifications();
  const { data: notifications = [], isLoading, isError, refetch } = notificationsQuery;
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const assignmentResponse = useAssignmentResponse();
  const unreadCount = notifications.filter((notification) => !notification.read).length;
  const visibleNotifications = useMemo(() => notifications.filter((notification) => {
    if (filter === "unread") return !notification.read;
    if (filter === "all") return true;
    return notification.type === filter;
  }), [notifications, filter]);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-100">Notifications</h2>
          <p className="mt-1 text-sm text-slate-500">{unreadCount} unread notification{unreadCount === 1 ? "" : "s"}</p>
        </div>
        <button
          type="button"
          onClick={() => markAllRead.mutate()}
          disabled={unreadCount === 0 || markAllRead.isPending}
          className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {markAllRead.isPending ? "Marking…" : "Mark all as read"}
        </button>
      </div>
      <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Notification filters">
        {filters.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setFilter(item.value)}
            aria-pressed={filter === item.value}
            className={`rounded-lg px-3 py-2 text-sm ${filter === item.value ? "bg-violet-600 text-white" : "bg-slate-800 text-slate-400 hover:text-slate-100"}`}
          >
            {item.label}
          </button>
        ))}
      </div>
      {isLoading ? (
        <p className="text-slate-400" role="status">Loading notifications...</p>
      ) : isError ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-center">
          <p className="text-sm text-red-300" role="alert">We couldn’t load your notifications.</p>
          <button type="button" onClick={() => refetch()} className="mt-3 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500">Try again</button>
        </div>
      ) : visibleNotifications.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-700 py-12 text-center text-slate-400">
          {filter === "all" ? "No notifications yet." : "No notifications match this filter."}
        </p>
      ) : (
        <div className="space-y-3">
          {visibleNotifications.map((notification) => (
            <div
              key={notification._id}
              className={`rounded-xl border p-4 ${notification.read ? "border-slate-700/50 bg-slate-800/30" : "border-violet-500/30 bg-violet-500/5"}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-medium text-slate-200">{notification.title}</p>
                  <p className="mt-1 text-sm text-slate-400">{notification.message}</p>
                  {notification.taskId ? <Link href={`/dashboard/tasks?task=${encodeURIComponent(notification.taskId)}`} className="mt-2 inline-block text-xs font-medium text-violet-300 hover:text-violet-200">Open related task</Link> : null}
                  {notification.type === "task_delegated" && notification.action === "assignment" && notification.taskId ? <div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => assignmentResponse.mutate({ taskId: notification.taskId!, action: "accept" })} disabled={assignmentResponse.isPending} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50">Accept assignment</button><button type="button" onClick={() => assignmentResponse.mutate({ taskId: notification.taskId!, action: "decline" })} disabled={assignmentResponse.isPending} className="rounded-lg border border-rose-700 px-3 py-1.5 text-xs font-medium text-rose-200 hover:bg-rose-900/30 disabled:opacity-50">Decline</button></div> : null}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <span className="text-xs text-slate-500">{formatRelativeDate(notification.createdAt)}</span>
                  {!notification.read && notification._id ? (
                    <button type="button" onClick={() => markRead.mutate(notification._id!)} disabled={markRead.isPending || markAllRead.isPending} className="text-xs font-medium text-violet-300 hover:text-violet-200 disabled:cursor-not-allowed disabled:opacity-50">Mark as read</button>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {markRead.isError || markAllRead.isError || assignmentResponse.isError ? <p className="mt-4 text-sm text-red-400" role="alert">Unable to update notification state. Please try again.</p> : null}
    </motion.div>
  );
}
