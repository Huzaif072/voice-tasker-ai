"use client";

import { useEffect, useRef } from "react";
import { useNotifications, useReminderSettings } from "@/hooks/useNotifications";
import { speakText } from "@/lib/voice/speak";

export function NotificationAnnouncer() {
  const { data: notifications } = useNotifications();
  const { data: settings } = useReminderSettings();
  const initialized = useRef(false);
  const announced = useRef(new Set<string>());

  useEffect(() => {
    if (!notifications) return;
    const currentIds = new Set(notifications.map((notification) => notification._id).filter((id): id is string => Boolean(id)));
    if (!initialized.current) {
      notifications.forEach((notification) => { if (notification._id) announced.current.add(notification._id); });
      initialized.current = true;
      return;
    }
    if (!settings?.enabled || !settings.channels.includes("voice")) return;
    notifications
      .filter((notification) => notification._id && !announced.current.has(notification._id))
      .filter((notification) => ["task_reminder", "context_trigger", "task_delegated", "delegation_status"].includes(notification.type))
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
      .forEach((notification) => {
        announced.current.add(notification._id!);
        speakText(`${notification.title}. ${notification.message}`);
      });
    announced.current.forEach((id) => { if (!currentIds.has(id)) announced.current.delete(id); });
  }, [notifications, settings]);

  return null;
}
